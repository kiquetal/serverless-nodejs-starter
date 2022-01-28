import AWS from 'aws-sdk';
import dayjs from "dayjs";

const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

export const main = async (event, context) => {
    const cognito = new AWS.CognitoIdentityServiceProvider();
    const bodyJSON = JSON.parse(event.body);
    const username = bodyJSON["username"];
    const params = {
        UserPoolId: process.env.USERPOOL_ID,
        Username: username
    };

    try {
        await cognito.adminDeleteUser(params).promise();

    } catch (err) {
        return ({
            statusCode: 500,
            body: JSON.stringify({"msg": err.toString()})
        });
    }
    return ({
        statusCode: 200,
        body: JSON.stringify({msg: `${username} removed from pool`})
    });
};
