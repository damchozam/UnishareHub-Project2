
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();

async function assignClaims() {
  let pageToken;
  let updated = 0;

  do {
    const result = await auth.listUsers(1000, pageToken);
    pageToken = result.pageToken;

    for (const user of result.users) {
      const existingClaims = user.customClaims || {};

      await auth.setCustomUserClaims(user.uid, {
        ...existingClaims,
        role: 'authenticated',
      });

      console.log(`Updated: ${user.email || user.uid}`);
      updated++;
    }
  } while (pageToken);

  console.log(`\nCompleted. Updated ${updated} Firebase users.`);
}

assignClaims()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to assign claims:', error);
    process.exit(1);
  });
