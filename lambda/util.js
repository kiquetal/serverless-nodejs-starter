export const validateIsAdmin = (isAdmin) => {


    if (isAdmin && isAdmin=="yes")
        return true;
    else
        return false;
};
export const createSuccessResponse = (body) => ({
   statusCode:200,
   body:JSON.stringify(body)
});
export const createCreatedResponse = (body) => ({
    statusCode:201,
    body:JSON.stringify(body)
});

export const createNotFoundResponse = (body) => ({
    statusCode:404,
    body:JSON.stringify(body)
});
export const createBadRequestResponse = (body) => ({
    statusCode:400,
    body:JSON.stringify(body)
});

export const createForbbidenResponse = (body) => ({
    statusCode:403,
    body:JSON.stringify(body)
});
export const createErrorResponse = (code,body) => ({
   statusCode:code,
   body:JSON.stringify(body)
});
export const validateBodyParams = (body, requiredParams) =>
{
    let missingParameters=[];
    requiredParams.map( requiredParameter => {

        if (!body[requiredParameter])
        {
            missingParameters.push(requiredParameter);
        }
    });
    return missingParameters;


};

export const isFromSSO = (username) => {

    if (username.startsWith("millicom-sso"))
        return true;
    return false;

};
