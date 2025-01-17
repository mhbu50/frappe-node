/**
 * Created by dbreton on 5/15/17.
 */
'use strict';
const request = require('request');
const requestPromise = require('request-promise-native');

function ERPNext(config) {
    this.host = config.host;
    this.user = config.user;
    this.password = config.password;
    this.api_key = config.api_key;
    this.api_secret = config.api_secret;
    this.cookieJar = request.jar();
    let self = this;
    
        this.host = host;
    };

    this.get_host = function(){
        return this.host;
    };

    this.set_user = function(user){
        this.user = user;
    };

    this.get_user = function(){
        return this.user;
    };

    this.set_password = function(password){
        this.password = password;
    };

    this.get_password = function(){
        return this.password;
    };

    this.buildUrlString = (params) => {
        if (!Array.isArray(params))
            throw "params must be an Array"
        return this.host + "/api/" + params.join('/')
    }

    this.login = function () {
        let url_path = '';
        let formData = {usr: self.user, pwd: self.password};
        if(self.user || self.password){
            url_path = '/api/method/login'
        }else if(this.api_key || this.api_secret){
            url_path = '/api/method/frappe.auth.get_logged_user'
        }
        console.log("url_path",url_path);
        return requestPromise.post({
            url: self.host + url_path,
            jar: self.cookieJar,
            form: formData,
        });
    };
    this.call = function (method, data) {
        return (new Promise((resolve, reject) => {
            self.login().then(() => {
                const urlString = self.buildUrlString(['method', method])
                return requestPromise.post({
                    url: urlString,
                    json: true,
                    jar: self.cookieJar,
                    form: data,
                    headers: {
                        'Content-Type':'application/json',
                        'Authorization':`token ${this.api_key}:${this.api_secret}`
                    }
                })

            })
                .then((res) => {resolve(res.message)})
                .catch(err => {reject(err)})
        }));
    };
    this.resource = (docType) => {
        return {
            find: (params = {}) => {
                return (new Promise((resolve, reject) => {
                    let urlString = self.buildUrlString(['resource', docType])
                    self.login().then(() => {
                        if (params.fields) {
                            urlString += '?fields=' + JSON.stringify(params.fields);
                            if (params.filters || params.page_length || params.page_start)
                                urlString += '&';
                        }
                        if (params.filters) {
                            if (!params.fields)
                                urlString += '?';
                            urlString += 'filters=' + JSON.stringify(params.filters);
                            if (params.page_length || params.page_start)
                                urlString += '&';
                        }
                        if (params.page_length) {
                            if (!params.fields && !params.filters)
                                urlString += '?';
                            urlString += 'limit_page_length=' + JSON.stringify(params.page_length);
                            if (params.page_start)
                                urlString += '&';
                        }
                        if (params.page_start) {
                            if (!params.fields && !params.filters && !params.page_length)
                                urlString += '?';
                            urlString += 'limit_start=' + JSON.stringify(params.page_start);
                        }
                        return requestPromise.get({
                            url: urlString,
                            json: true,
                            jar: self.cookieJar
                        })

                    })
                        .then((res) => {resolve(res.data)})
                        .catch(err => reject(err))
                }))
            },
            create: (params = {}) => {
                return (new Promise((resolve, reject) => {
                    let urlString = self.buildUrlString(['resource', docType])
                    self.login().then(() => {
                        return requestPromise.post({
                            url: urlString,
                            json: true,
                            jar: self.cookieJar,
                            body: params,
                            headers: {
                                'Content-Type':'application/json',
                            }
                        })
                    })
                        .then((res) => {resolve(res.data)})
                        .catch(err => reject(err))
                }))

            },
            get: (docName = "") => {
                return (new Promise((resolve, reject) => {
                    self.login().then(() => {
                        return requestPromise.get({
                            url: self.buildUrlString(['resource', docType,docName]),
                            json: true,
                            jar: self.cookieJar
                        })
                    })
                        .then((res) => {resolve(res.data)})
                        .catch(err => reject(err))
                }))

            },
            update: (docName = "", data = {}) => {
                return (new Promise((resolve, reject) => {
                    self.login().then(() => {
                        return requestPromise.put({
                            url: self.buildUrlString(['resource', docType,docName]),
                            json: true,
                            jar: self.cookieJar,
                            body: data,
                            headers: {
                                'Content-Type':'application/json',
                            }
                        })
                    }).then((res) => {
                        resolve(res.data)
                    }).catch(err => reject(err))
                }))
            },
            delete: (docName) => {
                return (new Promise((resolve, reject) => {
                    self.login().then(() => {
                        return requestPromise.delete({
                            url: self.buildUrlString(['resource', docType,docName]),
                            json: true,
                            jar: self.cookieJar,
                            headers: {
                                'Content-Type':'application/json',
                            }
                        })

                    }).then((res) => {
                        resolve(res)
                    }).catch(err=> {
                        reject(err);
                    })
                }))
            },
            exists: (docName) => {
                return (new Promise((resolve, reject) => {
                    self.login().then(() => {
                        self.resource(docType).get(docName).then((res, err) => {
                            if (!err)
                                resolve({exists: true})
                        }).catch(err => {
                            resolve({exists: false})
                        })
                    }).catch(err => reject(err))
                }));

            }
        }
    }


}

module.exports = ERPNext;
