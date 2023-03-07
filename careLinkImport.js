///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// 	CareLink API, import data for NodeJS
// ______________________________________
//
// -> Descritpion:
//
// 		A script translated in JS from this python library: https://github.com/ondrej1024/carelink-python-client,
// 		that allows you to retrieve the data from the Carelink API.
//
// -> Author:
//
//		Pourbaix "MaZeppAa" => https://github.com/Pourbaix
//
//
// -> How the API works globally:
//
//		You have 2 main parts when retrieving datas from the API:
//			-1. Getting an auth token
//			-2. Using the auth token to get datas
//
//
//	Copyright 2023-2024, Pourbaix Michaël
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const axios = require("axios");
const axiosCookiejarSupport = require("axios-cookiejar-support");
const toughCookie = require("tough-cookie");
const querystring = require("querystring");
const fs = require("fs");

const version = "0.3";

const carelink_connect_server_eu = "carelink.minimed.eu";
const carelink_connect_server_us = "carelink.minimed.com";
const carelink_language_en = "en";
const carelink_locale_en = "en";
const carelink_auth_token_cookie_name = "auth_tmp_token";
const carelink_token_validto_cookie_name = "c_token_valid_to";
const auth_expire_deadline_minutes = 1;

const debug = false;

function printdgb(msg) {
	////////////////////////////////////////////////////////
	// BASIC DEGUB FUNCTION
	// -----------------------
	// SET debug constant TO true TO DISPLAY DEBUG MESSAGES
	////////////////////////////////////////////////////////

	if (debug) {
		console.log(msg);
	}
}

class CareLinkClient {
	constructor(carelinkUsername, carelinkPassword, carelinkCountry) {
		this.carelinkUsername = carelinkUsername;
		this.carelinkPassword = carelinkPassword;
		this.carelinkCountry = carelinkCountry;

		this.sessionUser = null;
		this.sessionProfile = null;
		this.sessionCountrySettings = null;
		this.sessionMonitorData = null;

		this.loginInProcess = false;
		this.loggedIn = false;
		this.lastDataSucess = false;
		this.lastResponseCode = null;
		this.lastErrorMessage = null;

		this.authToken = null;
		this.tokenValidTo = null;

		// Common headers for the request => sometimes modified in some methods (for POST requests most of the time)
		this.commonHeaders = {
			"Accept-Language": "en;q=0.9, *;q=0.8",
			Connection: "keep-alive",
			"sec-ch-ua":
				'"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
			"User-agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
			Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
		};

		// CREATE MAIN HTTP CLIENT SESSION => HOW TO DO IT IN NODEJS EXPRESS?? => Using Axios and cookieJar
		const jar = new toughCookie.CookieJar();
		this.jar = jar;
		this.client = axiosCookiejarSupport.wrapper(axios.create({ jar }));
	}

	///////////////////////////////////////////////////////////////
	/////////////////NOT USEFULL, MIGHT BE REMOVED/////////////////

	getLastDataSucess() {
		return this.lastDataSucess;
	}

	getLastResponseCode() {
		return this.lastResponseCode;
	}

	getLastErrorMessage() {
		return this.lastErrorMessage;
	}

	careLinkServer() {
		return this.carelinkCountry == "us"
			? carelink_connect_server_us
			: carelink_connect_server_eu;
	}

	///////////////////////////////////////////////////////////////

	clearAllCookies() {
		this.jar.removeAllCookies((e) => {
			console.log("An error has occured while removing old cookies!!!");
			return e;
		});
	}

	stringStrip(string, caract) {
		/////////////////////////////////////////////////////////
		// function stringStrip(string: string, caract: string)
		// -----------------------------------------------------
		// Deletes the specified caracter at the beginning
		// and the end of a string if present
		/////////////////////////////////////////////////////////

		let endStr = string;
		if (string[0] == caract) {
			endStr = string.slice(1);
		}
		if (endStr[endStr.length - 1] == caract) {
			endStr = endStr.slice(0, -1);
		}
		return endStr;
	}

	extractResponseData(responseBody, begstr, endstr) {
		//////////////////////////////////////////////////////////////////////////////////////
		// function extractResponseData(responseBody: string, begstr: string, endstr: string)
		// ----------------------------------------------------------------------------------
		// Extract data from a string (responseBody) by specifying the begining and the end
		// of the extraction zone with the begstr and enstr variables.
		// (Used here to extract data from HTML)
		//////////////////////////////////////////////////////////////////////////////////////

		let beg = responseBody.indexOf(begstr) + begstr.length;
		let end = responseBody.indexOf(endstr, beg);

		return this.stringStrip(responseBody.slice(beg, end), '"');
	}

	async getLoginSession() {
		/////////////////////////////////////////////////////////
		// function getLoginSession()
		// -----------------------------------------------------
		// Retrieve a session from the web page to extract the
		// sessionID and sessionData
		/////////////////////////////////////////////////////////

		let url = "https://" + this.careLinkServer() + "/patient/sso/login";
		let payload = {
			country: this.carelinkCountry,
			lang: carelink_language_en,
		};
		let response = await this.client.get(url, {
			headers: this.commonHeaders,
			params: payload,
		});

		return response;
	}

	async doLogin(loginSessionResponse) {
		///////////////////////////////////////////////////////////////
		// function doLogin(loginSessionResponse: object)
		// -----------------------------------------------------------
		// Using the sessionID, sessionData and the username/password
		// of the CareLink account to retrieve a logged session
		//
		// /!\ Datas in the request need to be formated with
		// => querystring.stringify(), in order for the request to work
		///////////////////////////////////////////////////////////////

		let sessionResponseFromLogin = await loginSessionResponse;
		let queryParams = new URL(
			sessionResponseFromLogin.request.socket["_httpMessage"]["res"][
				"responseUrl"
			]
		).searchParams;

		printdgb("sessionID:  " + queryParams.get("sessionID"));
		printdgb("sessionData:  " + queryParams.get("sessionData"));

		let url =
			"https://mdtlogin.medtronic.com/mmcl/auth/oauth/v2/authorize/login";
		let payload = {
			locale: carelink_locale_en,
			country: this.carelinkCountry,
		};
		let form = {
			sessionID: queryParams.get("sessionID"),
			sessionData: queryParams.get("sessionData"),
			locale: carelink_locale_en,
			action: "login",
			username: this.carelinkUsername,
			password: this.carelinkPassword,
			actionButton: "Log in",
		};
		let response = await this.client.post(
			url,
			querystring.stringify(form),
			{
				headers: this.commonHeaders,
				params: payload,
			}
		);

		return response;
	}

	async doConsent(doLoginResponse) {
		///////////////////////////////////////////////////////////////
		// function doConsent(doLoginResponse: object)
		// -----------------------------------------------------------
		// Using the sessionID, sessionData of the loggedIn session
		// and retrieving the Auth token and his lifetime
		///////////////////////////////////////////////////////////////

		let doLoginRespBody = await doLoginResponse.data;
		let url = this.extractResponseData(
			doLoginRespBody,
			"<form action=",
			" "
		);
		let sessionID = this.extractResponseData(
			doLoginRespBody,
			'<input type="hidden" name="sessionID" value=',
			">"
		);
		let sessionData = this.extractResponseData(
			doLoginRespBody,
			'<input type="hidden" name="sessionData" value=',
			">"
		);

		let form = {
			action: "consent",
			sessionID: sessionID,
			sessionData: sessionData,
			responseType: "code",
			responseMode: "query",
		};
		let consentHeaders = this.commonHeaders;
		consentHeaders["Content-Type"] = "application/x-www-form-urlencoded";

		let response = await this.client.post(
			url,
			querystring.stringify(form),
			{
				headers: consentHeaders,
			}
		);
		let cookies = this.jar.getCookiesSync("https://carelink.minimed.eu");
		for (let cookie of cookies) {
			if (cookie.key == carelink_auth_token_cookie_name) {
				this.authToken = cookie;
			} else if (cookie.key == carelink_token_validto_cookie_name) {
				this.tokenValidTo = cookie;
			}
		}
		printdgb("authToken value:  " + this.authToken.value);
		printdgb("tokenValidTo value:  " + this.tokenValidTo.value);
		return response;
	}

	async getData(host, path, queryParams, requestBody) {
		///////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// function getData(host: string | null, path: string, queryParams: object | null, requestBody: object | null)
		// -----------------------------------------------------------------------------------------------------------
		// Use the auth token to retrieve data from a specified route with specified parameters
		// Can be a GET or POST request
		///////////////////////////////////////////////////////////////////////////////////////////////////////////////

		this.lastDataSucess = false;
		let url = "";
		if (host == null) {
			url = path;
		} else {
			url = "https://" + host + "/" + path;
		}

		let payload = queryParams;
		let data = requestBody;
		let jsonData = null;

		let authToken = this.authToken;
		let response = undefined;

		if (authToken != null) {
			let headers = this.commonHeaders;
			headers["Authorization"] = "Bearer " + authToken.value;
			if (data == null) {
				headers["Accept"] = "application/json, text/plain, */*";
				headers["Content-Type"] = "application/json; charset=utf-8";
				response = await this.client.get(url, {
					headers: headers,
					params: payload,
				});
				this.lastResponseCode = response.status;
			} else {
				headers["Accept"] =
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9";
				headers["Content-Type"] = "application/x-www-form-urlencoded";
				response = await this.client.post(url, data, {
					headers: headers,
				});
				this.lastResponseCode = response.status;
			}
			jsonData = response.data;
			this.lastDataSucess = true;
		}
		return jsonData;
	}

	async getMyUser() {
		return await this.getData(
			this.careLinkServer(),
			"patient/users/me",
			null,
			null
		);
	}

	async getMyProfile() {
		return await this.getData(
			this.careLinkServer(),
			"patient/users/me/profile",
			null,
			null
		);
	}

	async getCountrySettings(country, language) {
		let queryParams = { countryCode: country, language: language };
		return await this.getData(
			this.careLinkServer(),
			"patient/countries/settings",
			queryParams,
			null
		);
	}

	async getMonitorData() {
		return await this.getData(
			this.careLinkServer(),
			"patient/monitor/data",
			null,
			null
		);
	}

	async getLast24Hours() {
		let queryParams = {
			cpSerialNumber: "NONE",
			msgType: "last24hours",
			requestTime: "",
		};
		return await this.getData(
			this.careLinkServer(),
			"patient/connect/data",
			queryParams,
			null
		);
	}

	async getConnectDisplayMessage(username, role, endpointUrl) {
		let userJson = {
			username: username,
			role: role,
		};
		let requestBody = JSON.stringify(userJson);
		let recentData = await this.getData(
			null,
			endpointUrl,
			null,
			requestBody
		);
		if (!recentData) {
			this.correctTimeInRecentData(recentData);
		}
		return recentData;
	}

	correctTimeInRecentData(recentData) {
		// TODO
		return 1;
	}

	async executeLoginProcedure() {
		let lastLoginSuccess = false;
		this.loginInProcess = true;
		this.lastErrorMessage = null;

		await this.jar.removeAllCookies();

		this.sessionUser = null;
		this.sessionProfile = null;
		this.sessionCountrySettings = null;
		this.sessionMonitorData = null;

		let loginSessionResponse = await this.getLoginSession();
		this.lastResponseCode = loginSessionResponse.status;
		printdgb("getLoginSession statusCode:  " + this.lastResponseCode);

		let doLoginResponse = await this.doLogin(loginSessionResponse);
		this.lastResponseCode = doLoginResponse.status;
		printdgb("doLogin statusCode:  " + this.lastResponseCode);

		let consentResponse = await this.doConsent(doLoginResponse);
		this.lastResponseCode = consentResponse.status;
		printdgb("doConsent statusCode:  " + this.lastResponseCode);

		if (this.sessionUser == null) {
			this.sessionUser = await this.getMyUser();
		}
		if (this.sessionProfile == null) {
			this.sessionProfile = await this.getMyProfile();
		}
		if (this.sessionCountrySettings == null) {
			this.sessionCountrySettings = await this.getCountrySettings(
				this.carelinkCountry,
				carelink_language_en
			);
		}
		if (this.sessionMonitorData == null) {
			this.sessionMonitorData = await this.getMonitorData();
		}

		if (
			this.sessionUser != null &&
			this.sessionProfile != null &&
			this.sessionCountrySettings != null &&
			this.sessionMonitorData != null
		) {
			lastLoginSuccess = true;
		}
		this.loginInProcess = false;
		this.loggedIn = lastLoginSuccess;

		return lastLoginSuccess;
	}

	async getAuthorizationToken() {
		let tokenValidDate = this.tokenValidTo.value;

		if (
			!this.authToken ||
			!this.tokenValidTo ||
			this.lastResponseCode in [401, 403]
		) {
			if (this.loginInProcess) {
				return null;
			}
			if (!(await this.executeLoginProcedure())) {
				return null;
			}
		}
		return "Bearer " + this.authToken.value;
	}

	async getRecentData() {
		let role = "";
		if ((await this.getAuthorizationToken()) != null) {
			if (
				this.carelinkCountry == "us" ||
				this.sessionMonitorData.deviceFamily.includes("BLE")
			) {
				["CARE_PARTNER", "CARE_PARTNER_OUS"].includes(
					this.sessionUser.role
				)
					? (role = "carepartner")
					: (role = "patient");
				return await this.getConnectDisplayMessage(
					this.sessionProfile["username"],
					role,
					this.sessionCountrySettings["blePereodicDataEndpoint"]
				);
			} else {
				return await this.getLast24Hours();
			}
		} else {
			return null;
		}
	}

	async login() {
		if (!this.loggedIn) {
			await this.executeLoginProcedure();
		}
		return this.loggedIn;
	}
}

async function getLast24DataObject(username, password, country) {
	let connexion = new CareLinkClient(username, password, country);
	await connexion.executeLoginProcedure();
	let recentData = await connexion.getRecentData();
	// connexion.clearAllCookies();
	return recentData;
}

async function testCredential(username, password, country) {
	let testConnexion = new CareLinkClient(username, password, country);
	let result = await testConnexion.executeLoginProcedure();
	return result;
}

module.exports = {
	CareLinkClient,
	getLast24DataObject,
	testCredential,
};
