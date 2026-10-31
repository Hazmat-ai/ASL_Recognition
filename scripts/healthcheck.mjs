import {request} from 'node:http';
const req=request({host:'127.0.0.1',port:process.env.PORT??3000,path:'/api/health',headers:{host:new URL(process.env.APP_ORIGIN??'http://localhost:3000').host}},res=>{res.resume();process.exitCode=res.statusCode===200?0:1;});req.setTimeout(5000,()=>{req.destroy();process.exitCode=1;});req.on('error',()=>{process.exitCode=1;});req.end();
