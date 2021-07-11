'use strict';

const agent = require('superagent');
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
  let failed = [];
  for (let sd of jsonObj) {
    try {
      console.log("try connecting: " + sd.host + " at " + sd.ip);
      const res = await agent.head(sd.host).connect(sd.ip).timeout({response: 9000, deadline:10000}).retry(2);
      if (res.statusCode != 200) {
        let f = {"name" : sd.name, "host" : sd.host, "ip" : sd.ip, "status" : res.statusCode};
        failed.push(f);
      }
    } catch(err) {
      let f = {"name" : sd.name, "host" : sd.host, "ip" : sd.ip, "status" : err};
      failed.push(f);
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
};
