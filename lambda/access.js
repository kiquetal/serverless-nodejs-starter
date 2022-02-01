import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient();

export const main = async (event,context,callback) => {

    const bodyJSON = JSON.parse(event.body);
    const subject= event.requestContext.authorizer.claims["sub"];
    const isAdmin = event.requestContext.authorizer.claims["custom:isAdmin"];
    console.log(isAdmin);
    try
    {


        const paramUser = {
          TableName: process.env.APPS_TABLE,
          Key:{
              pk: bodyJSON["userId"],
              sk:"USER#ID"
          },
            AttributesToGet: [
                "pk"
            ]
        };
        const paramCred = {
            TableName: process.env.APPS_TABLE,
            Key:{
                pk: bodyJSON["credId"],
                sk:"CRED#ID"
            },
            AttributesToGet:[
                "pk",
                "clientId",
                "clientSecret"
            ]
        };

        const user = await dynamo.get(paramUser).promise();
        if (Object.keys(user).length<1)
            return ({
               statusCode:404,
               body:JSON.stringify({"msg":"clientId is not registered"})
            });
        const cred = await dynamo.get(paramCred).promise();
        if (Object.keys(cred).length<1)
            return ({
                statusCode:404,
                body:JSON.stringify({"msg":"credetenials is not registered"})
            });

        const params= {
            TableName: process.env.APPS_TABLE,
            Item:{
                pk: bodyJSON["userId"],
                sk: bodyJSON["credId"],
                type:"USER#CREDS",
                admin:subject,
                clientId: cred.Item["clientId"],
                clientSecret: cred.Item["clientSecret"]
            },
            ReturnValues:"ALL_OLD",
            ConditionExpression: "attribute_not_exists(pk) and attribute_not_exists(sk)"
        };

         await dynamo.put(params).promise();
        return ({
            statusCode:200,
            body:JSON.stringify(params.Item)
        });


    }
    catch (err)
    {
        return ({
            statusCode:500,
            body:JSON.stringify({"msg":err.toString()})
        });

    }


};
