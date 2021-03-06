import AWS from 'aws-sdk';
import dayjs from "dayjs";
import bent from 'bent';
import {createNotFoundResponse, createSuccessResponse} from "./util";
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const dynamo = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();


 const checkTokenInDatabase = async (sub) => {

    const paramsDB = {
        TableName: process.env.TOKENS_TABLE,
        KeyConditionExpression: "pk = :subValue",
        ExpressionAttributeValues: {
            ":subValue": sub,
            ":now": dayjs.utc().unix()
        },
        ExpressionAttributeNames: {
            "#time":"ttl"
        },
        FilterExpression: "#time > :now",

    };
    console.log(JSON.stringify(paramsDB));
    console.log("search "+ sub);
    const item = await dynamo.query(paramsDB).promise();
    console.log(JSON.stringify(item));
    if (item.Items.length>0)
    {
        const IdToken = item.Items[0]["sk"];
        return { IdToken };

    }
    else
        return null;


};

async function insertToken(sub, response) {

    const modelServer= {
        pk:sub,
        sk:response.AuthenticationResult.IdToken,
        ttl:dayjs.utc().add(50,'minutes').unix()
    };

    await dynamo.put({
        TableName: process.env.TOKENS_TABLE,
        Item: modelServer,
        ConditionExpression: "attribute_not_exists(pk)"
    }).promise();
    console.log("insert in token table");
}

export const main = async (event, context) => {
    const bodyJSON = JSON.parse(event.body);
    const sub = bodyJSON["subId"];
    const paramsDB = {
        TableName: process.env.SERVERS_TABLE,
        KeyConditionExpression: "pk = :subValue",
        ExpressionAttributeValues: {
            ":subValue": sub
        }
    };
    const item = await dynamo.query(paramsDB).promise();


    if (item.Items.length<1)
        return createNotFoundResponse({msg:`Subject not found`});
    const username = item.Items[0]["username"];
    const password = item.Items[0]["password"];

    const idToken  = await checkTokenInDatabase(sub);
    if (idToken) {
        return createSuccessResponse(idToken);
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
        return createSuccessResponse({IdToken:response.AuthenticationResult.IdToken});

    }

};

const querySub=async (sub) => {

    const paramsDB = {
        TableName: process.env.SERVERS_TABLE,
        KeyConditionExpression: "pk = :subValue",
        ExpressionAttributeValues: {
            ":subValue": sub
        }
    };
    const item = await dynamo.query(paramsDB).promise();

    return item;
};

export const tokens = async(event,context,callback) => {
    const bodyJSON = JSON.parse(event.body);
    const sub = bodyJSON["subId"];

    const clientId = event.queryStringParameters!=null?event.queryStringParameters["clientId"]:null;
    if (!clientId)
    {
        return createNotFoundResponse({"msg":"Must send `clientId` queryParameter"});
    }
    try {

        const item = await querySub(sub);
        if (item.Items.length < 1)
            return createNotFoundResponse({"msg":"Subject not found"});
        const username = item.Items[0]["username"];
        const password = item.Items[0]["password"];

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
        const idToken = response.AuthenticationResult.IdToken;
        console.log(JSON.stringify(idToken));
       const rp =  bent('POST',[200,404,403]);
       const res= await rp(`https://ayhtpry9ja.execute-api.us-east-1.amazonaws.com/dev/token?clientId=${clientId}`,null,{
            'Authorization':idToken
        });
       const jsonData=await res.json();
       console.log(JSON.stringify(jsonData));
        return createSuccessResponse(jsonData);

    }
    catch (err)
    {
        console.log(JSON.stringify(err));
        return({
            statusCode:500,
            body:JSON.stringify({"msg":err.message})
        });
    }

};


