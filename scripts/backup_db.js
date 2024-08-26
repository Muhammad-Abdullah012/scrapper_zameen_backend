const { spawn } = require('child_process');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { PassThrough } = require('stream');
const { resolve } = require('path');
const cliProgress = require('cli-progress');
require('dotenv').config({ path: resolve(__dirname, '..', '.env.production.local') });

const { DB_BACKUP_FOLDER_ID, POSTGRES_USER, POSTGRES_DB } = process.env;
const credentials = require('../credentials/credentials.json');
const folderId = DB_BACKUP_FOLDER_ID;
const backupFileName = `zameen_scrapper_db_node_dump_${getCurrentDate()}.sql`;

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

function createDbDumpStream() {
  const dumpStream = new PassThrough();
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(100, 0);
  const dumpProcess = spawn('sudo', ['docker', 'exec', '-t', 'my_postgres_container', 'pg_dump', '-c', '-U', POSTGRES_USER, POSTGRES_DB]);
  let progress = 0;

  dumpProcess.stdout.on('data', () => {
    progress += 1;
    if (progress > progressBar.getTotal()) {
      progressBar.setTotal(progress);
    }
    progressBar.update(progress);
  });

  dumpProcess.stdout.pipe(dumpStream);

  dumpProcess.stderr.on('data', data => {
    console.error(`pg_dumpall stderr: ${data}`);
  });

  dumpProcess.on('close', code => {
    progressBar.stop();
    if (code !== 0) {
      console.log(`pg_dumpall process exited with code ${code}`);
    }
  });

  return dumpStream;
}

async function authenticate() {
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

async function uploadToDrive(auth, dumpStream) {
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: backupFileName,
    mimeType: 'application/sql',
    parents: [folderId],
  };

  const media = {
    mimeType: 'application/octet-stream',
    body: dumpStream,
  };

  try {
    console.log('uploading media');
    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    console.log('File Id:', res.data.id);
    console.log('File uploaded successfully.');
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

async function deleteOldBackups(auth) {
  const drive = google.drive({ version: 'v3', auth });
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const listFiles = async () => {
    const response = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id, name, createdTime)',
    });
    return response.data.files;
  };

  const deleteFile = async fileId => {
    await drive.files.delete({
      fileId,
    });
  };

  try {
    const files = await listFiles();
    if (files.length === 0) return;

    for (const { id, name, createdTime } of files) {
      const fileCreatedTime = new Date(createdTime);
      if (fileCreatedTime < threeDaysAgo) {
        await deleteFile(id);
        console.log(`Deleted old backup file: ${name}`);
      }
    }
  } catch (error) {
    console.error('Error deleting old backups:', error);
  }
}

async function main() {
  try {
    const auth = await authenticate();
    const dumpStream = createDbDumpStream();
    await uploadToDrive(auth, dumpStream);
    await deleteOldBackups(auth);
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

main();
