import AWS from 'aws-sdk';
import {
    createCreatedResponse,
    createErrorResponse,
    createForbbidenResponse,
    createNotFoundResponse, isFromSSO,
    validateIsAdmin
} from "./util";
const dynamo = new AWS.DynamoDB.DocumentClient();

export const main = async (event,context,callback) => {

    const bodyJSON = JSON.parse(event.body);
    const subject= event.requestContext.authorizer.claims["sub"];
    const isAdminAttribute = event.requestContext.authorizer.claims["custom:isAdmin"];
    const usernameClaim = event.requestContext.authorizer.claims["cognito:username"];
    if (!validateIsAdmin(isAdminAttribute))
        return createForbbidenResponse({"msg": "Not allowed to do this action."});

    console.log("check user from sso");
    if (!isFromSSO(usernameClaim))
        return createForbbidenResponse({"msg": "Not allowed to do this action."});

    try
    {


        const paramUser = {
          TableName: process.env.APPS_TABLE,
          Key:{
              pk: bodyJSON["subId"],
              sk:"USER#ID"
          },
            AttributesToGet: [
                "pk"
            ]
        };
        const paramCred = {
            TableName: process.env.APPS_TABLE,
            Key:{
                pk: bodyJSON["clientId"],
                sk:"CLIENT#ID"
            },
            AttributesToGet:[
                "pk",
                "clientId",
                "clientSecret",
                "nameApp"
            ]
        };

        const user = await dynamo.get(paramUser).promise();
        if (Object.keys(user).length<1)
            return createNotFoundResponse({ "msg":"clientId is not registered"});
        const cred = await dynamo.get(paramCred).promise();
        if (Object.keys(cred).length<1)
            return createNotFoundResponse({ "msg":"clientId is not registered"});


        const params= {
            TableName: process.env.APPS_TABLE,
            Item:{
                pk: bodyJSON["subId"],
                sk: bodyJSON["clientId"],
                type:"USER#CREDS",
                admin:subject,
                clientId: cred.Item["clientId"],
                clientSecret: cred.Item["clientSecret"],
                nameApp: cred.Item["nameApp"]
            },
            ReturnValues:"ALL_OLD",
            ConditionExpression: "attribute_not_exists(pk) and attribute_not_exists(sk)"
        };

         await dynamo.put(params).promise();
        return createCreatedResponse({
            "clientId":params.Item["pk"],
            "name":params.Item["nameApp"]
        });


    }
    catch (err)
    {
        return createErrorResponse(500,{msg:err.toString()});

    }


};
