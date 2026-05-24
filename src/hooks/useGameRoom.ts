import { useState, useEffect, useRef } from 'react';
import { pb } from '../pocketbase';

export interface RoomSettings {
  categories: string[];
  duration: number; // in seconds (0 = unlimited)
  maxRounds: number;
  stopMode: 'instant' | 'countdown'; // countdown = 10s grace
  lettersPool: string[];
  validateFirstLetter?: boolean;
}

export interface RoomRecord {
  id: string;
  host_id: string;
  status: 'lobby' | 'spinning' | 'playing' | 'evaluating' | 'results' | 'finished';
  settings: RoomSettings;
  code: string;
  current_round: number;
  current_letter: string;
  timer_ends_at: string; // ISO string
  timer_duration: number;
  letters_used: string[];
  stop_triggered_by: string; // player name
}

export interface PlayerRecord {
  id: string;
  room_id: string;
  name: string;
  is_host: boolean;
  is_ready: boolean;
  points_total: number;
  last_active: string; // ISO string
  session_id: string;
  user_id?: string;
  is_co_host?: boolean;
  avatar?: string;
}

export interface AnswerRecord {
  id: string;
  room_id: string;
  player_id: string;
  round_num: number;
  answers: Record<string, string>; // categoryId -> typed text
  points: Record<string, number>; // categoryId -> points (computed)
  votes: Record<string, Record<string, boolean>>; // categoryId -> { voterPlayerId -> isValid }
  hearts: Record<string, string[]>; // categoryId -> [player_id, ...]
  is_submitted: boolean;
}

const DEFAULT_CATEGORIES = ['Stadt', 'Land', 'Fluss', 'Name', 'Tier', 'Beruf', 'Essen/Trinken'];
const DEFAULT_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVW'.split(''); // Excluded Q, X, Y, Z, J, K by default for better playability

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude 0, 1, I, O
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useGameRoom() {
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [me, setMe] = useState<PlayerRecord | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(pb.authStore.model);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setUser(pb.authStore.model);
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(model);
    });
    return () => unsubscribe();
  }, []);

  // Load avatars dynamically for users
  useEffect(() => {
    const missingUserIds = players
      .map((p) => p.user_id)
      .filter((id): id is string => !!id && avatarMap[id] === undefined);

    if (missingUserIds.length === 0) return;

    // Immediately mark as loading with empty string so we don't trigger double fetches
    setAvatarMap((prev) => {
      const next = { ...prev };
      missingUserIds.forEach((id) => {
        next[id] = '';
      });
      return next;
    });

    const fetchAvatars = async () => {
      try {
        const filterString = missingUserIds.map((id) => `id = "${id}"`).join(' || ');
        const userRecords = await pb.collection('users').getFullList({
          filter: filterString,
          fields: 'id,avatar',
        });
        
        setAvatarMap((prev) => {
          const next = { ...prev };
          userRecords.forEach((u) => {
            if (u.avatar) {
              next[u.id] = u.avatar;
            }
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to fetch user avatars:', err);
      }
    };

    fetchAvatars();
  }, [players, avatarMap]);

  // Synchronize URL Hash when room state changes
  useEffect(() => {
    if (room?.code) {
      window.location.hash = room.code;
    } else {
      if (window.location.hash) {
        window.location.hash = '';
      }
    }
  }, [room]);

  // Auto Rejoin on refresh if matching session exists in room hash
  useEffect(() => {
    const autoRejoin = async () => {
      const hash = window.location.hash;
      if (hash && hash.length > 1) {
        const code = hash.substring(1).toUpperCase();
        if (code.length === 6) {
          try {
            const sessionId = getSessionId();
            const list = await pb.collection('rooms').getList(1, 1, {
              filter: `code = "${code}"`
            });
            if (list.items.length > 0) {
              const targetRoom = list.items[0];
              const playersInRoom = await pb.collection('players').getFullList({
                filter: `room_id = "${targetRoom.id}" && session_id = "${sessionId}"`
              });
              if (playersInRoom.length > 0) {
                const existingPlayer = playersInRoom[0];
                const updatedPlayer = await pb.collection('players').update(existingPlayer.id, {
                  last_active: new Date().toISOString()
                });
                setRoom(targetRoom as unknown as RoomRecord);
                setMe(updatedPlayer as unknown as PlayerRecord);
                await loadRoomData(targetRoom.id);
              }
            }
          } catch (err) {
            console.warn('Auto-rejoin failed:', err);
          }
        }
      }
    };
    autoRejoin();
  }, []);

  const roomRef = useRef<RoomRecord | null>(null);
  const playersRef = useRef<PlayerRecord[]>([]);
  const meRef = useRef<PlayerRecord | null>(null);

  // Sync refs so callbacks in subscription handlers always have fresh state
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { meRef.current = me; }, [me]);

  // Session ID management for tab refresh survival
  const getSessionId = (): string => {
    let id = localStorage.getItem('slf_session_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('slf_session_id', id);
    }
    return id;
  };

  // 1. Presence Heartbeat and Offline player filter
  useEffect(() => {
    if (!me || !room) return;

    // Send heartbeat
    const heartbeatInterval = setInterval(async () => {
      try {
        const updated = await pb.collection('players').update(me.id, {
          last_active: new Date().toISOString(),
        });
        setMe(updated as unknown as PlayerRecord);
      } catch (err) {
        console.warn('Failed to send presence heartbeat:', err);
      }
    }, 8000);

    // Clean up or flag players offline (run client-side by host)
    const cleanupInterval = setInterval(async () => {
      if (!meRef.current?.is_host || !roomRef.current) return;
      const now = Date.now();
      const playersList = playersRef.current;

      for (const p of playersList) {
        if (p.id === meRef.current.id) continue;
        const lastActiveTime = new Date(p.last_active).getTime();
        // If inactive for > 25 seconds, delete their player record
        if (now - lastActiveTime > 25000) {
          try {
            console.log(`Deleting inactive player ${p.name}`);
            await pb.collection('players').delete(p.id);
          } catch (err) {
            console.error('Failed to prune inactive player:', err);
          }
        }
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
    };
  }, [me?.id, room?.id]);

  // 2. Realtime Subscriptions
  useEffect(() => {
    if (!room) return;

    const roomId = room.id;

    // Subscribe to Room changes
    pb.collection('rooms').subscribe(roomId, (e) => {
      if (e.action === 'update') {
        setRoom(e.record as unknown as RoomRecord);
      } else if (e.action === 'delete') {
        leaveRoom();
        setError('Das Spielzimmer wurde gelöscht.');
      }
    });

    // Subscribe to Players changes
    pb.collection('players').subscribe('*', (e) => {
      if (e.action === 'create' || e.action === 'update') {
        if (e.record.room_id !== roomId) return;
        
        // Update local list
        setPlayers((prev) => {
          const index = prev.findIndex((p) => p.id === e.record.id);
          if (index > -1) {
            const next = [...prev];
            next[index] = e.record as unknown as PlayerRecord;
            return next;
          }
          return [...prev, e.record as unknown as PlayerRecord];
        });

        // Update me record if it was us
        if (e.record.session_id === getSessionId()) {
          setMe(e.record as unknown as PlayerRecord);
        }
      } else if (e.action === 'delete') {
        setPlayers((prev) => prev.filter((p) => p.id !== e.record.id));
        if (meRef.current && e.record.id === meRef.current.id) {
          leaveRoom();
        }
      }
    });

    // Subscribe to Answers changes
    pb.collection('answers').subscribe('*', (e) => {
      if (e.action === 'create' || e.action === 'update') {
        if (e.record.room_id !== roomId) return;
        setAnswers((prev) => {
          const index = prev.findIndex((a) => a.id === e.record.id);
          if (index > -1) {
            const next = [...prev];
            next[index] = e.record as unknown as AnswerRecord;
            return next;
          }
          return [...prev, e.record as unknown as AnswerRecord];
        });
      } else if (e.action === 'delete') {
        setAnswers((prev) => prev.filter((a) => a.id !== e.record.id));
      }
    });

    return () => {
      pb.collection('rooms').unsubscribe(roomId);
      pb.collection('players').unsubscribe('*');
      pb.collection('answers').unsubscribe('*');
    };
  }, [room?.id]);

  // Initial load helper for player list and answers inside a room
  const loadRoomData = async (roomId: string) => {
    try {
      const plist = await pb.collection('players').getFullList({
        filter: `room_id = "${roomId}"`,
      });
      setPlayers(plist as unknown as PlayerRecord[]);

      const alist = await pb.collection('answers').getFullList({
        filter: `room_id = "${roomId}"`,
      });
      setAnswers(alist as unknown as AnswerRecord[]);
    } catch (err) {
      console.error('Failed to load room details:', err);
    }
  };

  // Actions
  const createRoom = async (playerName: string, customCategories?: string[]) => {
    setIsConnecting(true);
    setError(null);
    try {
      const sessionId = getSessionId();
      
      const settings: RoomSettings = {
        categories: customCategories && customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES,
        duration: 60,
        maxRounds: 5,
        stopMode: 'countdown',
        lettersPool: DEFAULT_LETTERS,
        validateFirstLetter: true,
      };

      // Generate unique 6-char room code
      let roomCode = generateRoomCode();
      let attempts = 0;
      while (attempts < 5) {
        try {
          const check = await pb.collection('rooms').getList(1, 1, {
            filter: `code = "${roomCode}"`,
          });
          if (check.totalItems === 0) {
            break;
          }
        } catch (e) {
          // If query fails, ignore and try again
        }
        roomCode = generateRoomCode();
        attempts++;
      }

      // 1. Create Room
      const newRoom = await pb.collection('rooms').create({
        host_id: '', // Will update after creating host player
        status: 'lobby',
        code: roomCode,
        settings,
        current_round: 1,
        current_letter: '',
        timer_ends_at: '',
        timer_duration: 60,
        letters_used: [],
        stop_triggered_by: '',
      });

      // 2. Create Host Player
      const newPlayer = await pb.collection('players').create({
        room_id: newRoom.id,
        name: playerName,
        is_host: true,
        is_ready: true,
        points_total: 0,
        last_active: new Date().toISOString(),
        session_id: sessionId,
        user_id: pb.authStore.model?.id || '',
      });

      // 3. Bind Host to Room
      const updatedRoom = await pb.collection('rooms').update(newRoom.id, {
        host_id: newPlayer.id,
      });

      setRoom(updatedRoom as unknown as RoomRecord);
      setMe(newPlayer as unknown as PlayerRecord);
      await loadRoomData(newRoom.id);
    } catch (err: any) {
      setError(err.message || 'Raum-Erstellung fehlgeschlagen.');
    } finally {
      setIsConnecting(false);
    }
  };

  const joinRoom = async (roomCodeOrId: string, playerName: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const sessionId = getSessionId();
      const cleanInput = roomCodeOrId.trim();
      
      let targetRoom: RoomRecord | null = null;
      
      // Try fetching by 6-character code first
      if (cleanInput.length === 6) {
        try {
          const list = await pb.collection('rooms').getList(1, 1, {
            filter: `code = "${cleanInput.toUpperCase()}"`,
          });
          if (list.items.length > 0) {
            targetRoom = list.items[0] as unknown as RoomRecord;
          }
        } catch (err) {
          console.warn('Failed to find room by code, trying direct ID lookup:', err);
        }
      }
      
      // Fallback: search by 15-character record ID
      if (!targetRoom) {
        try {
          targetRoom = (await pb.collection('rooms').getOne(cleanInput)) as unknown as RoomRecord;
        } catch (err) {
          throw new Error('Spielraum nicht gefunden. Bitte Code prüfen.');
        }
      }

      const roomId = targetRoom.id;

      // Check if session ID already exists in this room (reconnect!)
      const existingPlayers = await pb.collection('players').getFullList({
        filter: `room_id = "${roomId}" && session_id = "${sessionId}"`,
      });

      let playerRec: PlayerRecord;
      if (existingPlayers.length > 0) {
        // Reconnect existing
        playerRec = (await pb.collection('players').update(existingPlayers[0].id, {
          name: playerName, // Update name if changed
          last_active: new Date().toISOString(),
          user_id: pb.authStore.model?.id || '',
        })) as unknown as PlayerRecord;
      } else {
        // Create new player
        playerRec = (await pb.collection('players').create({
          room_id: roomId,
          name: playerName,
          is_host: false,
          is_ready: false,
          points_total: 0,
          last_active: new Date().toISOString(),
          session_id: sessionId,
          user_id: pb.authStore.model?.id || '',
        })) as unknown as PlayerRecord;
      }

      setRoom(targetRoom);
      setMe(playerRec);
      await loadRoomData(roomId);
    } catch (err: any) {
      setError(err.message || 'Raumbeitritt fehlgeschlagen.');
    } finally {
      setIsConnecting(false);
    }
  };

  const updateSettings = async (settings: Partial<RoomSettings>) => {
    if (!room || (!me?.is_host && !me?.is_co_host)) return;
    try {
      const updatedSettings = { ...room.settings, ...settings };
      const updated = await pb.collection('rooms').update(room.id, {
        settings: updatedSettings,
        timer_duration: updatedSettings.duration,
      });
      setRoom(updated as unknown as RoomRecord);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const toggleReady = async () => {
    if (!me) return;
    try {
      const updated = await pb.collection('players').update(me.id, {
        is_ready: !me.is_ready,
      });
      setMe(updated as unknown as PlayerRecord);
    } catch (err) {
      console.error('Failed to toggle ready:', err);
    }
  };

  const startRound = async () => {
    if (!room || !me?.is_host) return;
    try {
      // 1. Pick a random letter from pool not yet used
      const pool = room.settings.lettersPool.length > 0 ? room.settings.lettersPool : DEFAULT_LETTERS;
      const unusedLetters = pool.filter((l) => !room.letters_used.includes(l));
      
      let letter = 'A';
      if (unusedLetters.length > 0) {
        letter = unusedLetters[Math.floor(Math.random() * unusedLetters.length)];
      } else {
        // Recycle pool if all used
        letter = pool[Math.floor(Math.random() * pool.length)];
      }

      // Clear answers from previous round in DB (host cleanup)
      const oldAnswers = await pb.collection('answers').getFullList({
        filter: `room_id = "${room.id}"`,
      });
      for (const ans of oldAnswers) {
        await pb.collection('answers').delete(ans.id);
      }

      // Reset players is_ready to false (except host who clicks start, but we can reset all for clean state)
      for (const p of players) {
        await pb.collection('players').update(p.id, { is_ready: false });
      }

      // Update room to trigger spinner
      await pb.collection('rooms').update(room.id, {
        status: 'spinning',
        current_letter: letter,
        timer_ends_at: '',
        stop_triggered_by: '',
      });
    } catch (err) {
      console.error('Failed to start round:', err);
    }
  };

  const finishSpinning = async () => {
    if (!room || !me?.is_host) return;
    try {
      const duration = room.settings.duration;
      let timerEndsAt = '';
      if (duration > 0) {
        timerEndsAt = new Date(Date.now() + duration * 1000).toISOString();
      }

      await pb.collection('rooms').update(room.id, {
        status: 'playing',
        timer_ends_at: timerEndsAt,
      });
    } catch (err) {
      console.error('Failed to finish spinning:', err);
    }
  };

  const submitAnswers = async (roundNum: number, answersJson: Record<string, string>) => {
    if (!room || !me) return;
    try {
      // Check if answer already exists
      const existing = await pb.collection('answers').getFullList({
        filter: `room_id = "${room.id}" && player_id = "${me.id}" && round_num = ${roundNum}`,
      });

      const initialVotes: Record<string, Record<string, boolean>> = {};
      const initialHearts: Record<string, string[]> = {};
      
      // Auto prefill keys
      room.settings.categories.forEach((cat) => {
        initialVotes[cat] = {};
        initialHearts[cat] = [];
      });

      if (existing.length > 0) {
        await pb.collection('answers').update(existing[0].id, {
          answers: answersJson,
          is_submitted: true,
        });
      } else {
        await pb.collection('answers').create({
          room_id: room.id,
          player_id: me.id,
          round_num: roundNum,
          answers: answersJson,
          is_submitted: true,
          votes: initialVotes,
          hearts: initialHearts,
          points: {},
        });
      }
    } catch (err) {
      console.error('Failed to submit answers:', err);
    }
  };

  const triggerStop = async () => {
    if (!room || !me) return;
    try {
      if (room.settings.stopMode === 'countdown') {
        let shouldSetTenSeconds = true;
        if (room.timer_ends_at) {
          const currentRemaining = new Date(room.timer_ends_at).getTime() - Date.now();
          if (currentRemaining > 0 && currentRemaining <= 10000) {
            shouldSetTenSeconds = false;
          }
        }

        const updateData: any = {
          stop_triggered_by: me.name,
        };
        if (shouldSetTenSeconds) {
          updateData.timer_ends_at = new Date(Date.now() + 10500).toISOString();
        }
        await pb.collection('rooms').update(room.id, updateData);
      } else {
        // Instant stop
        await pb.collection('rooms').update(room.id, {
          stop_triggered_by: me.name,
          status: 'evaluating',
          timer_ends_at: '',
        });
      }
    } catch (err) {
      console.error('Failed to stop round:', err);
    }
  };

  // Called automatically when timer reaches zero or countdown concludes
  const forceEvaluate = async () => {
    if (!room || !me?.is_host) return;
    try {
      await pb.collection('rooms').update(room.id, {
        status: 'evaluating',
        timer_ends_at: '',
      });
    } catch (err) {
      console.error('Failed to transition to evaluation:', err);
    }
  };

  const castVote = async (answerId: string, category: string, voterId: string, isValid: boolean) => {
    try {
      const answer = answers.find((a) => a.id === answerId);
      if (!answer) return;

      const votes = { ...(answer.votes || {}) };
      if (!votes[category]) votes[category] = {};
      
      votes[category] = { ...votes[category], [voterId]: isValid };

      // Optimistic update
      setAnswers((prev) =>
        prev.map((a) => (a.id === answerId ? { ...a, votes } : a))
      );

      await pb.collection('answers').update(answerId, { votes });
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  const castHeart = async (answerId: string, category: string, voterId: string) => {
    try {
      const answer = answers.find((a) => a.id === answerId);
      if (!answer) return;

      const hearts = { ...(answer.hearts || {}) };
      if (!hearts[category]) hearts[category] = [];

      let updatedList = [...hearts[category]];
      if (updatedList.includes(voterId)) {
        updatedList = updatedList.filter((id) => id !== voterId);
      } else {
        updatedList.push(voterId);
      }
      hearts[category] = updatedList;

      // Optimistic update
      setAnswers((prev) =>
        prev.map((a) => (a.id === answerId ? { ...a, hearts } : a))
      );

      await pb.collection('answers').update(answerId, { hearts });
    } catch (err) {
      console.error('Failed to toggle heart:', err);
    }
  };

  const evaluateRoundAndFinish = async () => {
    if (!room || !me?.is_host) return;
    try {
      const categories = room.settings.categories;
      const letter = room.current_letter.toLowerCase();
      const enforceFirstLetter = room.settings.validateFirstLetter !== false;
      
      // Calculate points locally first
      const updatedAnswers = answers.map((ans) => {
        const pointsMap: Record<string, number> = {};

        categories.forEach((cat) => {
          const rawAnswer = (ans.answers[cat] || '').trim();
          
          // Basic validation check
          let isValid = rawAnswer.length > 0;
          if (isValid && enforceFirstLetter) {
            isValid = rawAnswer[0].toLowerCase() === letter;
          }

          // Check community votes
          const categoryVotes = ans.votes[cat] || {};
          const yesVotes = Object.values(categoryVotes).filter((v) => v === true).length;
          const noVotes = Object.values(categoryVotes).filter((v) => v === false).length;

          // If downvoted by more people than upvoted
          if (noVotes > yesVotes) {
            isValid = false;
          }

          if (!isValid) {
            pointsMap[cat] = 0;
            return;
          }

          // Count how many players wrote a valid answer in this category
          const normalizedVal = rawAnswer.toLowerCase();
          const allValidAnswersInCat = answers
            .map((a) => {
              const otherRaw = (a.answers[cat] || '').trim();
              const otherVotes = a.votes[cat] || {};
              const otherYes = Object.values(otherVotes).filter((v) => v === true).length;
              const otherNo = Object.values(otherVotes).filter((v) => v === false).length;
              
              const isOtherValid =
                otherRaw.length > 0 &&
                (!enforceFirstLetter || otherRaw[0].toLowerCase() === letter) &&
                !(otherNo > otherYes);

              return { playerId: a.player_id, val: otherRaw.toLowerCase(), valid: isOtherValid };
            })
            .filter((item) => item.valid);

          const playersWithValidAnswer = allValidAnswersInCat.map((x) => x.playerId);

          if (playersWithValidAnswer.length === 1) {
            // Only person who answered in this category!
            pointsMap[cat] = 20;
          } else {
            // Check duplicates
            const duplicates = allValidAnswersInCat.filter((x) => x.val === normalizedVal);
            if (duplicates.length > 1) {
              pointsMap[cat] = 5; // same answer as others
            } else {
              pointsMap[cat] = 10; // unique answer
            }
          }

          // Add bonus points for hearts
          const heartList = ans.hearts[cat] || [];
          pointsMap[cat] += heartList.length; // +1 point per creativity heart
        });

        return {
          id: ans.id,
          playerId: ans.player_id,
          points: pointsMap,
          totalPoints: Object.values(pointsMap).reduce((sum, v) => sum + v, 0),
        };
      });

      // Update answers in DB with calculated points
      for (const item of updatedAnswers) {
        await pb.collection('answers').update(item.id, { points: item.points });
      }

      // Update players total scores
      for (const p of players) {
        const roundReward = updatedAnswers.find((x) => x.playerId === p.id)?.totalPoints || 0;
        const newTotal = (p.points_total || 0) + roundReward;
        await pb.collection('players').update(p.id, {
          points_total: newTotal,
          is_ready: false, // reset ready check for next round
        });
      }

      // Add letter to letters_used
      const updatedUsed = [...(room.letters_used || []), room.current_letter];

      // Check if max rounds reached
      const isFinished = room.current_round >= room.settings.maxRounds;

      if (isFinished) {
        try {
          const finalPlayersList = players.map(p => {
            const roundReward = updatedAnswers.find((x) => x.playerId === p.id)?.totalPoints || 0;
            return {
              ...p,
              points_total: (p.points_total || 0) + roundReward
            };
          });

          const sorted = [...finalPlayersList].sort((a, b) => (b.points_total || 0) - (a.points_total || 0));
          const playersData = sorted.map((p, idx) => {
            let rank = idx + 1;
            if (idx > 0 && (p.points_total || 0) === (sorted[idx - 1].points_total || 0)) {
              const firstTied = sorted.find(x => (x.points_total || 0) === (p.points_total || 0));
              if (firstTied) {
                rank = sorted.indexOf(firstTied) + 1;
              }
            }
            return {
              user_id: p.user_id || '',
              name: p.name,
              points: p.points_total || 0,
              rank
            };
          });

          // 1. Create match history entry
          await pb.collection('match_history').create({
            code: room.code,
            categories: room.settings.categories,
            players: playersData,
            rounds: room.current_round,
            ended_at: new Date().toISOString()
          });

          // 2. Update user aggregates for registered players
          for (const p of finalPlayersList) {
            if (p.user_id) {
              try {
                const userRec = await pb.collection('users').getOne(p.user_id);
                const pointsTotal = (userRec.points_total || 0) + (p.points_total || 0);
                const gamesTotal = (userRec.games_total || 0) + 1;
                const isWinner = playersData.find(pd => pd.user_id === p.user_id)?.rank === 1;
                const winsTotal = (userRec.wins_total || 0) + (isWinner ? 1 : 0);

                await pb.collection('users').update(p.user_id, {
                  points_total: pointsTotal,
                  games_total: gamesTotal,
                  wins_total: winsTotal
                });
              } catch (userErr) {
                console.error(`Failed to update statistics for user ${p.user_id}:`, userErr);
              }
            }
          }
        } catch (historyErr) {
          console.error('Failed to save match history or update statistics:', historyErr);
        }
      }

      await pb.collection('rooms').update(room.id, {
        letters_used: updatedUsed,
        status: isFinished ? 'finished' : 'results',
      });
    } catch (err) {
      console.error('Failed to run final round scoring evaluation:', err);
    }
  };

  const nextRound = async () => {
    if (!room || !me?.is_host) return;
    try {
      const pool = room.settings.lettersPool && room.settings.lettersPool.length > 0 
        ? room.settings.lettersPool 
        : DEFAULT_LETTERS;
      const unusedLetters = pool.filter((l) => !room.letters_used.includes(l));
      
      let letter = 'A';
      if (unusedLetters.length > 0) {
        letter = unusedLetters[Math.floor(Math.random() * unusedLetters.length)];
      } else {
        letter = pool[Math.floor(Math.random() * pool.length)];
      }

      // Clear answers from previous round in DB
      const oldAnswers = await pb.collection('answers').getFullList({
        filter: `room_id = "${room.id}"`,
      });
      for (const ans of oldAnswers) {
        await pb.collection('answers').delete(ans.id);
      }

      // Increment round and trigger spinner directly
      await pb.collection('rooms').update(room.id, {
        current_round: room.current_round + 1,
        status: 'spinning',
        current_letter: letter,
        timer_ends_at: '',
        stop_triggered_by: '',
      });
    } catch (err) {
      console.error('Failed to advance to next round:', err);
    }
  };

  const leaveRoom = async () => {
    if (me) {
      try {
        await pb.collection('players').delete(me.id);
      } catch (err) {
        console.warn('Failed to delete player on exit:', err);
      }
    }
    setRoom(null);
    setPlayers([]);
    setMe(null);
    setAnswers([]);
  };

  const register = async (email: string, password: string, displayName?: string, avatarFile?: File | null) => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('passwordConfirm', password);
    if (displayName) {
      formData.append('name', displayName);
    }
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    await pb.collection('users').create(formData);
    await pb.collection('users').authWithPassword(email, password);
  };

  const login = async (email: string, password: string) => {
    await pb.collection('users').authWithPassword(email, password);
  };

  const logout = () => {
    pb.authStore.clear();
  };

  const updateProfile = async (displayName: string, avatarFile: File | null) => {
    if (!pb.authStore.model) return;
    const formData = new FormData();
    formData.append('name', displayName);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    const updated = await pb.collection('users').update(pb.authStore.model.id, formData);
    setUser(updated);
    if (updated && updated.avatar) {
      setAvatarMap((prev) => ({
        ...prev,
        [updated.id]: updated.avatar,
      }));
    }
    return updated;
  };

  // Enrich players and me with avatar information
  const enrichedPlayers = players.map((p) => ({
    ...p,
    avatar: p.user_id ? avatarMap[p.user_id] : undefined,
  }));

  const enrichedMe = me ? {
    ...me,
    avatar: me.user_id ? avatarMap[me.user_id] : undefined,
  } : null;

  return {
    room,
    players: enrichedPlayers,
    me: enrichedMe,
    answers,
    isConnecting,
    error,
    createRoom,
    joinRoom,
    updateSettings,
    toggleReady,
    startRound,
    finishSpinning,
    submitAnswers,
    triggerStop,
    forceEvaluate,
    castVote,
    castHeart,
    evaluateRoundAndFinish,
    nextRound,
    leaveRoom,
    user,
    register,
    login,
    logout,
    updateProfile,
  };
}
