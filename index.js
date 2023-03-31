'use strict';

const agent = require('superagent');
const Redis = require('ioredis');
const fs = require('fs');
const serverData = fs.readFileSync('./.jsonfiles/server.json', 'utf8');
const jsonObj = JSON.parse(serverData);

const nodemailer = require('nodemailer');
const emailID = fs.readFileSync('./.jsonfiles/email.json', 'utf8');
const emailObj = JSON.parse(emailID);
const transporter = nodemailer.createTransport({
  host: emailObj.server,
  port: emailObj.port,
  auth: {
    user: emailObj.user,
    pass: emailObj.key
  }
})

exports.check = async (event, context, callback) => {
  try {
    let failed = [];
    const redis_cli = new Redis({
        port: 6379,
        host: "172.27.83.227",
    });
    for (let sd of jsonObj) {
      try {
        console.log("try connecting: " + sd.host + " at " + sd.ip);
        const res = await agent.head(sd.host).connect(sd.ip).ok(res => res.status < 400).timeout({response: 9000, deadline:10000}).retry(2);
        if (res.statusCode >= 400) {
          let f = {"name" : sd.name, "host" : sd.host, "ip" : sd.ip, "status" : res.statusCode};
          let prev_record = await redis_cli.get(sd.name);
          if (prev_record == "failed") {
            // this is the second failure
            failed.push(f);
          }
          await redis_cli.set(sd.name, "failed");
          await redis_cli.expire(sd.name, 7500); // 125 min
        }
      } catch(err) {
        let f = {"name" : sd.name, "host" : sd.host, "ip" : sd.ip, "status" : err};
        let prev_record = await redis_cli.get(sd.name);
        if (prev_record == "failed") {
          // this is the second failure
          failed.push(f);
        }
        await redis_cli.set(sd.name, "failed");
        await redis_cli.expire(sd.name, 7500); // 125 min
      }
    }
    
    if (failed.length > 0) {
      await transporter.sendMail({
        from: emailObj.user,
        to: emailObj.to,
        subject: "Server connection failed",
        text: JSON.stringify(failed)
      });
    }

    callback(null, JSON.stringify(failed));
  } catch(err) {
    console.log(err);
    await transporter.sendMail({
      from: emailObj.user,
      to: emailObj.to,
      subject: "Aliyun FC execution error",
      text: `${err.name}: ${err.message}`,
    });
    callback(null, `${err.name}: ${err.message}`);
  }
};
