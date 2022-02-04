import AWS from 'aws-sdk';
import {createErrorResponse, createSuccessResponse, validateIsAdmin} from "./util";

const dynamo = new AWS.DynamoDB.DocumentClient();
export const main = async (event, context, callback) => {

    const bodyJSON = JSON.parse(event.body);
    const clientId = bodyJSON["credentials"]["clientId"];
    const clientSecret = bodyJSON["credentials"]["clientSecret"];
    const name = bodyJSON["nameApp"];
    const developerName = bodyJSON["developerEmail"];
    const params = {
        TableName: process.env.APPS_TABLE,
        Item: {
            pk: `client#${clientId}`,
            sk: "CLIENT#ID",
            developerApp: developerName,
            clientId: clientId,
            clientSecret: clientSecret,
            nameApp: name,
            type: "CLIENT_CREDENTIALS"
        },
        ReturnValues: "ALL_OLD",
        ConditionExpressio: "attribute_not_exists(pk) and attribute_not_exists(sk)"
    };


    try {
        await dynamo.put(params).promise();


    } catch (err) {
        return createErrorResponse(500, {msg: err.toString()});
    }
    return createSuccessResponse({
        "clientId": params.Item.clientId,
        "name": params.Item.nameApp
    });

};

export const get = async (event, context, callback) => {
    console.log(JSON.stringify(event.requestContext.authorizer));

    const isAdminAttribute = event.requestContext.authorizer.claims["custom:isAdmin"];
    let isAdmin = false;
    if (validateIsAdmin(isAdminAttribute))
        isAdmin = true;
    const subject = event.requestContext.authorizer.claims["sub"];
    try {

        const queryForAdmin = {

            TableName: process.env.APPS_TABLE,
            IndexName: "index_by_sk",
            ProjectionExpression: "pk,nameApp",
            KeyConditionExpression: "#sk = :sk ",
            ExpressionAttributeValues: {
                ":sk": "CLIENT#ID"
            },
            ExpressionAttributeNames: {
                "#sk": "sk",

            }

        };

        const query = {
            TableName: process.env.APPS_TABLE,
            ProjectionExpression: "sk,nameApp",
            KeyConditionExpression: "pk = :pk and begins_with(#sk, :app)",
            ExpressionAttributeValues: {
                ":pk": subject,
                ":app": "client#"
            },
            ExpressionAttributeNames: {
                "#sk": "sk",

            },
        };

        let resp;
        let modelForReturn;
        if (!isAdmin) {
            resp = await dynamo.query(query).promise();
            modelForReturn = resp.Items.map(value => {
                return {
                    clientId: value["sk"].substring(7),
                    nameApp: value["nameApp"]
                };
            });
        } else {
            resp = await dynamo.query(queryForAdmin).promise();

            modelForReturn = resp.Items.map(value => {
                return {
                    clientId: value["pk"].substring(7),
                    nameApp: value["nameApp"]
                };
            });
        }


        return createSuccessResponse({
            credentials: modelForReturn
        });

    } catch (err) {
        return createErrorResponse(500, {msg: err.toString()});
    }

};
