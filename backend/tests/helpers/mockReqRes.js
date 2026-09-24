/**
 * Test helper utilities to mock Express Request, Response, and Next functions.
 */

export const mockRequest = ({
    headers = {},
    body = {},
    params = {},
    query = {},
    user = null,
    seller = null
} = {}) => {
    return {
        headers: { ...headers },
        body: { ...body },
        params: { ...params },
        query: { ...query },
        user,
        seller
    };
};

export const mockResponse = () => {
    const res = {
        statusCode: 200,
        jsonData: null,
        sentData: null,
        headersSent: false
    };

    res.status = function (code) {
        res.statusCode = code;
        return res;
    };

    res.json = function (data) {
        res.jsonData = data;
        res.headersSent = true;
        return res;
    };

    res.send = function (data) {
        res.sentData = data;
        res.headersSent = true;
        return res;
    };

    return res;
};

export const mockNext = () => {
    const next = function (err) {
        next.called = true;
        next.error = err || null;
    };
    next.called = false;
    next.error = null;
    return next;
};
