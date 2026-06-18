/**
 * Manual migration script: creates the 'messages' collection and adds
 * the 'is_kicked' field to the 'players' collection via the PocketBase
 * Admin API.
 *
 * Usage:
 *   node scripts/apply-migrations.cjs <admin_email> <admin_password>
 *
 * If no admin exists yet, first create one at http://127.0.0.1:8090/_/
 */

const PB_URL = 'http://127.0.0.1:8090';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: node scripts/apply-migrations.cjs <admin_email> <admin_password>');
    console.log('');
    console.log('If you have no admin yet, open http://127.0.0.1:8090/_/ in your browser to create one.');
    process.exit(1);
  }

  // 1. Authenticate as admin
  console.log('Authenticating as admin...');
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  });

  if (!authRes.ok) {
    const err = await authRes.json();
    console.error('Auth failed:', err);
    process.exit(1);
  }

  const authData = await authRes.json();
  const token = authData.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token,
  };

  console.log('Authenticated successfully.');

  // 2. Check if 'messages' collection already exists
  console.log('Checking if messages collection exists...');
  const messagesCheck = await fetch(`${PB_URL}/api/collections/messages`, { headers });
  
  if (messagesCheck.ok) {
    console.log('messages collection already exists, skipping creation.');
  } else {
    console.log('Creating messages collection...');
    const createRes = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'messages',
        type: 'base',
        schema: [
          { name: 'room_id', type: 'text', required: true },
          { name: 'player_id', type: 'text', required: false },
          { name: 'player_name', type: 'text', required: true },
          { name: 'text', type: 'text', required: true },
          { name: 'type', type: 'text', required: true },
          { name: 'avatar', type: 'text', required: false },
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
      }),
    });

    if (createRes.ok) {
      console.log('messages collection created successfully!');
    } else {
      const err = await createRes.json();
      console.error('Failed to create messages collection:', err);
    }
  }

  // 3. Check if 'is_kicked' field exists on 'players' collection
  console.log('Checking players collection schema...');
  const playersRes = await fetch(`${PB_URL}/api/collections/players`, { headers });
  
  if (!playersRes.ok) {
    console.error('Failed to fetch players collection');
    process.exit(1);
  }

  const playersCollection = await playersRes.json();
  const hasIsKicked = playersCollection.schema.some(f => f.name === 'is_kicked');

  if (hasIsKicked) {
    console.log('is_kicked field already exists on players, skipping.');
  } else {
    console.log('Adding is_kicked field to players collection...');
    const updatedSchema = [
      ...playersCollection.schema,
      { name: 'is_kicked', type: 'bool', required: false },
    ];

    const updateRes = await fetch(`${PB_URL}/api/collections/players`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ schema: updatedSchema }),
    });

    if (updateRes.ok) {
      console.log('is_kicked field added to players successfully!');
    } else {
      const err = await updateRes.json();
      console.error('Failed to add is_kicked field:', err);
    }
  }

  console.log('Migration complete!');
}

main().catch(err => {
  console.error('Migration script error:', err);
  process.exit(1);
});
