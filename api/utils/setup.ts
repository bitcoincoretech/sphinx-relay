import { loadLightning } from './lightning'
import {sequelize, models} from '../models'
import { exec } from 'child_process'

const USER_VERSION = 1

const setupDatabase = async () => {
  console.log('=> [db] starting setup...')
  await setVersion()
  try {
    await sequelize.sync()
    console.log("=> [db] done syncing")
  } catch(e) {
    console.log("db sync failed",e)
  }
  await migrate()
  setupOwnerContact()
  console.log('=> [db] setup done')
}

async function setVersion(){
  try {
    await sequelize.query(`PRAGMA user_version = ${USER_VERSION}`)
  } catch(e) {
    console.log('=> setVersion failed',e)
  }
}

async function migrate(){
  try {
    await sequelize.query(`update sphinx_chats SET deleted=false where deleted is null`)
  } catch(e) {
    console.log('=> migrate failed',e)
  }
}

const setupOwnerContact = async () => {
  const owner = await models.Contact.findOne({ where: { isOwner: true }})
  if (!owner) {
    const lightning = await loadLightning()
    lightning.getInfo({}, async (err, info) => {
      if (err) {
        console.log('[db] error creating node owner due to lnd failure', err)
      } else {
        try {
          const one = await models.Contact.findOne({ where: { id: 1 }})
          if(!one){
            const contact = await models.Contact.create({
              id: 1,
              publicKey: info.identity_pubkey,
              isOwner: true,
              authToken: null
            })
            console.log('[db] created node owner contact, id:', contact.id)
          }          
        } catch(error) {
          console.log('[db] error creating owner contact', error)
        }
      }
    })
  }
}

const runMigrations = async () => {
  await new Promise((resolve, reject) => {
    const migrate: any = exec('node_modules/.bin/sequelize db:migrate',
      {env: process.env},
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );

    // Forward stdout+stderr to this process
    migrate.stdout.pipe(process.stdout);
    migrate.stderr.pipe(process.stderr);
  });
}

export { setupDatabase, setupOwnerContact, runMigrations }



