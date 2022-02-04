import AWS from 'aws-sdk';
import bent from "bent";
import {createErrorResponse, createForbbidenResponse, createNotFoundResponse, createSuccessResponse} from "./util";


const dynamo = new AWS.DynamoDB.DocumentClient();
export const main = async (event, context, callback) => {


    const clientId = event.queryStringParameters != null ? event.queryStringParameters["clientId"] : null;
    if (!clientId)
        return createNotFoundResponse({"msg": "Must provide a clientId parameter"});
    //console.log(JSON.stringify(event.headers["Authorization"]));

   try
   {
       const subject = event.requestContext.authorizer.claims["sub"];
    const isAdmin = event.requestContext.authorizer.claims["custom:isAdmin"];
    const notExists = event.requestContext.authorizer.claims["custom:kiquetal"];
    console.log("isAdmin: [" + isAdmin + "]");
    console.log("notExists: [" + notExists + "]");
    if (!notExists) console.log("attribute_not_exists");
    if (!isAdmin || isAdmin != "yes") {

        const params = {
            TableName: process.env.APPS_TABLE,
            ProjectionExpression: "clientId,clientSecret,nameApp",
            //      KeyConditionExpression: "pk = :pk and begins_with(#sk, :app)",
            KeyConditionExpression: "pk = :pk and #sk = :app",

            ExpressionAttributeValues: {
                ":pk": subject,
                ":app": `client#${clientId}`
            },
            ExpressionAttributeNames: {
                "#sk": "sk",
            }
        };
        const resp = await dynamo.query(params).promise();
        console.log(JSON.stringify(resp));
        if (resp.Items.length < 1) {
            console.log("not association");
            return createForbbidenResponse({"msg": "Not allowed"});
        }

        const authApigee = 'Basic ' + Buffer.from(resp.Items[0]["clientId"] + ":" + resp.Items[0]["clientSecret"]).toString('base64');

        const rsJson = await obtainTokenApigee(authApigee);
        return createSuccessResponse({
            "clientId": rsJson["client_id"],
            "name": resp.Items[0]["nameApp"],
            "accessToken": rsJson.access_token,
            "productList": rsJson.api_product_list
        });

    } else {  //admin Can request any credential
        if (isAdmin && isAdmin == "yes") {
            console.log("hello admin");
            const paramCred = {
                TableName: process.env.APPS_TABLE,
                Key: {
                    pk: `client#${clientId}`,
                    sk: "CLIENT#ID"
                },
                AttributesToGet: [
                    "pk",
                    "clientId",
                    "clientSecret",
                    "nameApp"
                ]
            };

            const credential = await dynamo.get(paramCred).promise();
            if (Object.keys(credential).length < 1) {
                return createNotFoundResponse({"msg": `${clientId} was not found.`});
            }

            const authForApigee = 'Basic ' + Buffer.from(credential.Item["clientId"] + ":" + credential.Item["clientSecret"]).toString('base64');
            const rsJson = await obtainTokenApigee(authForApigee);
            return createSuccessResponse({
                "clientId": rsJson.client_id,
                "name": credential.Item["nameApp"],
                "accessToken": rsJson.access_token,
                "productList": rsJson.api_product_list
            });
        } else {
            console.log("never should reach here");
        }
    }
}
    catch(err)
    {
        return createErrorResponse(500,{
            msg:err.toString()
        });
    }
};

const obtainTokenApigee = async (basiAuth) => {
    const apigee =  bent('POST',200);

    const domain = process.env.APIGEEURL;
    const rp =await apigee(`${domain}?grant_type=client_credentials`,null,{
        'Authorization': basiAuth
    });

    const rsJson = await rp.json();
    return rsJson;
};
