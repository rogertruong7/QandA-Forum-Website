import { showError } from './main.js';
// API Calls
export const authCall = (path, body) => {
	return fetch('http://localhost:5005/' + path, {
		method: 'POST',
		body: body,
		headers: {
            'Content-type': 'application/json',
        },
	})
	.then((response) => response.json())
	.then((data) => {
		if (data.error) {
			showError(400, "Invalid input");
		} else {
			console.log(data);
			document.getElementById('sign_in_email').value = '';
    		document.getElementById('sign_in_password').value = '';
			document.getElementById('register_email').value = '';
			document.getElementById('register_name').value = '';
			document.getElementById('register_password').value = '';
			document.getElementById('confirm_password').value = '';
			localStorage.setItem('token', data.token);
			localStorage.setItem('userId', data.userId);
			return Promise.resolve(data);
		}
	})
};

export const createApiCall = (path, body, token) => {
	return fetch('http://localhost:5005/' + path, {
		method: 'POST',
		body: body,
		headers: {
            'Content-type': 'application/json',
			'Authorization': token ? `Bearer ${token}` : undefined,
        },
	})
	.then((response) => {
		if (response.status !== 200) {
			return Promise.reject(response);
		}
		return response.json();
	})
	.then((data) => {
		console.log(data);
		return Promise.resolve(data);
	})
	.catch((error) => {
		console.log(error);
        if (error.status === 400) {
			showError(error.status, "Invalid input");
		} else if (error.status === 403) {
			showError(error.status, "Invalid token");
		} else if (error.status === 500) {
			showError(error.status, "Internal Server Error");
		}
    });
};

export const getApiCall = (path, queryString, token) => {
	return fetch('http://localhost:5005/' + path + '?' + queryString, {
		method: 'GET',
		headers: {
            'Content-type': 'application/json',
			'Authorization': token ? `Bearer ${token}` : undefined,
        },
	})
	.then((response) => {
		if (response.status !== 200) {
			return Promise.reject(response);
		}
		return response.json();
	})
	.then((data) => {
		return Promise.resolve(data);
	})
	.catch((error) => {
		console.log(error);
        if (error.status === 400) {
			showError(error.status, "Invalid input");
		} else if (error.status === 403) {
			showError(error.status, "Invalid token");
		} else if (error.status === 500) {
			showError(error.status, "Internal Server Error");
		}
		return Promise.reject(error);
    });
};

// Works for all puts
export const putApiCall = (path, body, token) => {
	return fetch('http://localhost:5005/' + path, {
		method: 'PUT',
		body: body,
		headers: {
            'Content-type': 'application/json',
			'Authorization': token ? `Bearer ${token}` : undefined,
        },
	})
	.then((response) => {
		if (response.status !== 200) {
			return Promise.reject(response);
		}
		return response.json();
	})
	.then((data) => {
		return Promise.resolve(data);
	})
	.catch((error) => {
		console.log(error);
        if (error.status === 400) {
			showError(error.status, "Invalid input");
		} else if (error.status === 403) {
			showError(error.status, "Invalid token");
		} else if (error.status === 500) {
			showError(error.status, "Internal Server Error");
		}
    });
};

export const deleteApiCall = (path, body, token) => {
	return fetch('http://localhost:5005/' + path, {
		method: 'DELETE',
		body: body,
		headers: {
            'Content-type': 'application/json',
			'Authorization': token ? `Bearer ${token}` : undefined,
        },
	})
	.then((response) => {
		if (response.status !== 200) {
			return Promise.reject(response);
		}
		return response.json();
	})
	.then((data) => {
		return Promise.resolve(data);
	})
	.catch((error) => {
		console.log(error);
        if (error.status === 400) {
			showError(error.status, "Invalid input");
		} else if (error.status === 403) {
			showError(error.status, "Invalid token");
		} else if (error.status === 500) {
			showError(error.status, "Internal Server Error");
		}
    });
};