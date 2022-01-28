import AWS from 'aws-sdk';
import dayjs from "dayjs";

const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const dynamo = new AWS.DynamoDB.DocumentClient();


 const checkTokenInDatabase = async (sub) => {

    const paramsDB = {
        TableName: process.env.TOKENS_TABLE,
        KeyConditionExpression: "pk = :subValue",
        ExpressionAttributeValues: {
            ":subValue": sub
        }
    };
    console.log(JSON.stringify(paramsDB));
    console.log("search "+ sub);
    const item = await dynamo.query(paramsDB).promise();
    console.log(JSON.stringify(item));
    if (item.Items.length>0)
    {
        const idToken = item.Items[0]["sk"];
        console.log(idToken);
        return { idToken };

    }
    else
        return null;


};

async function insertToken(sub, response) {

    const modelServer= {
        pk:sub,
        sk:response.AuthenticationResult.IdToken,
        ttl:dayjs.utc().add(1,'hour').unix()
    };

    await dynamo.put({
        TableName: process.env.TOKENS_TABLE,
        Item: modelServer,
        ConditionExpression: "attribute_not_exists(pk)"
    }).promise();
    console.log("insert in token table");
}

export const main = async (event, context) => {
    const cognito = new AWS.CognitoIdentityServiceProvider();
    const bodyJSON = JSON.parse(event.body);
    const sub = bodyJSON["sub"];
    const paramsDB = {
        TableName: process.env.SERVERS_TABLE,
        KeyConditionExpression: "pk = :subValue",
        ExpressionAttributeValues: {
            ":subValue": sub
        }
    };
    const item = await dynamo.query(paramsDB).promise();

    console.log(JSON.stringify(item.Items));

    const username = item.Items[0]["username"];
    const password = item.Items[0]["password"];

    const {idToken}  = await checkTokenInDatabase(sub);
    if (idToken) {
        return ({
            statusCode: 200,
            body: JSON.stringify({idToken})
        });
    }
     else {
        const params = {
            AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
            UserPoolId: process.env.USERPOOL_ID,
            ClientId: process.env.CLIENT_ID,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password
            }
        };
        const response = await cognito.adminInitiateAuth(params).promise();
        await insertToken(sub,response);
        return ({
            statusCode: 200,
            body: JSON.stringify(response.AuthenticationResult)
        });

    }

};

