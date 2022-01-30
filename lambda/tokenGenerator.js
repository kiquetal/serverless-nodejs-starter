export const main = async (event, context, callback) => {
    console.log("Authentication successful");
    console.log("Trigger function =", event.triggerSource);
    console.log("User pool = ", event.userPoolId);
    console.log("App client ID = ", event.callerContext.clientId);
    console.log("User ID = ", event.userName);
return event;
};
