import AWS from 'aws-sdk';
import {nanoid} from "nanoid";
const dynamo = new AWS.DynamoDB.DocumentClient();
export const main = async (event,context,callback) => {


    const bodyJSON = JSON.parse(event.body);

    const params = {
        TableName: process.env.APPS_TABLE,
        Item: {
            pk: bodyJSON["appId"],
            sk: "APP#ID",
            developerApp: bodyJSON["developerApp"],
            nameApp:bodyJSON["nameApp"],
            type: "APP"
        },
        ReturnValues:"ALL_OLD"
    };


    try {
        await dynamo.put(params).promise();
    }
    catch (err)
    {
        return ({
           statusCode:500,
           body:JSON.stringify({"msg":err.toString()})
        });
    }
      return ({
        statusCode: 200,
        body: JSON.stringify(params["Item"])
    });
};

export const get = async (event,context,callback) => {
    console.log(JSON.stringify(event.requestContext.authorizer));
    return ({
        statusCode: 200,
        body: JSON.stringify({"msg":"ok"})
    });

};
export const creds = async (event,context,callback) => {


    const bodyJSON = JSON.parse(event.body);

    const params = {
        TableName: process.env.APPS_TABLE,
        Item: {
            pk: bodyJSON["appId"],
            sk: "CRED#"+nanoid(5),
            clientId: bodyJSON["credentials"]["clientId"],
            clientSecret: bodyJSON["credentials"]["clientSecret"],
            type: "CRED"
        },
        ReturnValues:"ALL_OLD"
    };


    try {
        await dynamo.put(params).promise();
    }
    catch (err)
    {
        return ({
            statusCode:500,
            body:JSON.stringify({"msg":err.toString()})
        });
    }
    return ({
        statusCode: 200,
        body: JSON.stringify(params["Item"])
    });

};
