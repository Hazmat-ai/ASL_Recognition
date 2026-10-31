import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
const db=new DatabaseSync(process.env.DB_PATH??'data/palm.sqlite',{readOnly:true});
const destination=process.env.BACKUP_PATH??`backups/palm-${Date.now()}.sqlite`;
await mkdir(dirname(destination),{recursive:true});
try{await backup(db,destination);console.log('SQLite backup completed:',destination);}finally{db.close();}
