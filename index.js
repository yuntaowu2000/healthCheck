'use strict';

const agent = require('superagent');
const fs = require('fs');
const serverData = fs.readFileSync('./.jsonfiles/server.json', 'utf8');
const jsonObj = JSON.parse(serverData);

exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello!' }),
  };

  callback(null, response); 
};

exports.check = async (event, context, callback) => {
  let result = [];
  for (let sd of jsonObj) {
    const res = await agent.head(sd.host).connect(sd.ip);
    console.log(res);
    result.push({[sd.host] : res.statusCode});
  }
  
  callback(null, JSON.stringify(result));
};
