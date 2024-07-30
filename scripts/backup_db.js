const { spawn } = require('child_process');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { PassThrough } = require('stream');
const cliProgress = require('cli-progress');

const credentials = require('../credentials/credentials.json');
const folderId = '1ZDYqmWVVMk6sVeMrKIDwCDx7GTEliWyK';
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
  const dumpProcess = spawn('sudo', [
    'docker',
    'exec',
    '-t',
    'my_postgres_container',
    'pg_dump',
    '-d',
    'zameen_scrapper_db_node',
    '-c',
    '-U',
    'zameen_scrapper_admin',
  ]);
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

async function main() {
  try {
    const auth = await authenticate();
    const dumpStream = createDbDumpStream();
    await uploadToDrive(auth, dumpStream);
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

main();
