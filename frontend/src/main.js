import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, truncateText, formatDate, stringToBool } from './helpers.js';

console.log('Let\'s go!');

window.onload = () => {
    const activeScreen = localStorage.getItem('activeScreen') || 'login_screen'; // Default to login_screen
    switchScreen(activeScreen);
};

const pollForAdminStatus = () => {
    getApiCall('user', 'userId=' + localStorage.getItem('userId'), localStorage.getItem('token'))
    .then((response) => {
        localStorage.setItem('isAdmin', response.admin);
        console.log("Admin status updated: ", response.admin);
    })
    .catch((error) => {
        console.error("Error while fetching admin status:", error);
    });
};

setInterval(pollForAdminStatus, 120000);

const switchScreen = (newScreenId) => {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
	if (newScreenId === 'app_screen') {
		loadThreads(0);
		pollForAdminStatus();
	}
    const newScreen = document.getElementById(newScreenId);
    newScreen.classList.add('active');

    localStorage.setItem('activeScreen', newScreenId);
}

// Loading the 5 threads on the sidebar
const loadThreads = (startValue) => {
	const queryString = 'start=' + startValue;
	const threadDetails = getApiCall('threads', queryString, localStorage.getItem('token'))
	.then((t) => {
		return Promise.all(t.map(id => getApiCall('thread', 'id=' + id, localStorage.getItem('token'))));
	})

	threadDetails.then((threads) => {
        const creatorIds = Object.values(threads).map(thread => thread.creatorId);
    
		return Promise.all(creatorIds.map(id => getApiCall('user', 'userId=' + id, localStorage.getItem('token'))))
		.then((res) => {
			return {threads, res};
		});
    })
	.then(({ threads, res }) => {
		let i = 0;
		while (i < res.length) {
			// If its private, we dont own it, and were not admin, cont
			if (!(threads[i].isPublic) && (threads[i].creatorId !== parseInt(localStorage.getItem('userId'))) && !stringToBool(localStorage.getItem("isAdmin"))) {
				i++;
				continue;
			}
			createThreadListItem(
				res[i].name,
				threads[i].likes,               
				threads[i].title,
				threads[i].createdAt,
				threads[i].id,
				"bottom"
			);
			i++;
		}
		const newStartValue = parseInt(startValue) + threads.length;
		localStorage.setItem('seenThreads', newStartValue);
		return threads;
	});
	
	threadDetails.then((t) => {
		let newStartValue = parseInt(startValue) + t.length;
		const newQueryString = 'start=' + newStartValue;
		return getApiCall('threads', newQueryString, localStorage.getItem('token'));
	})
	.then((t) => {
		if (t.length === 0) {
			console.log("No more threads");
			document.getElementById('view_more_button').style.visibility = "hidden"; 
		}

	});
}

// Helper functions

const createThreadListItem = (name, likes, title, date, id, placement) => {
    const sidebarList = document.getElementById('threads_sidebar');
    const listItem = document.createElement('li');
    listItem.className = 'sidebar-item';

    // Title
    const titleParagraph = document.createElement('b');
    titleParagraph.textContent = truncateText(title);

    // Date
    const dateParagraph = document.createElement('p');
    dateParagraph.textContent = 'Posted on: ' + formatDate(date);

    // Likes
    const likesParagraph = document.createElement('p');
    likesParagraph.textContent = 'Likes: ' + likes.length;

    // Name
    const nameParagraph = document.createElement('p');
    nameParagraph.textContent = truncateText('Posted by: ' + name);

	listItem.setAttribute('id', id);

    // Append paragraphs to list item
	listItem.appendChild(titleParagraph);
	listItem.appendChild(nameParagraph);
	listItem.appendChild(dateParagraph);
	listItem.appendChild(likesParagraph);
	if (placement === "bottom") {
		sidebarList.appendChild(listItem);
	} else if (placement === "top") {
		sidebarList.prepend(listItem);
	}
	return listItem;
}


const switchAppScreen = (newScreenId) => {
    const screens = document.querySelectorAll('.appScreen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const newScreen = document.getElementById(newScreenId);
    newScreen.classList.add('active');
}

const showError = (number, string) => {
	document.getElementById('error_title').textContent = 'ERROR ' + number;
	document.getElementById('error_description').textContent = string;
	const errorPopup = document.getElementById('error_popup');
	errorPopup.classList.remove('hidden');
	throw error;
}

const changingHeart = (likes, imageSource) => {
	if (likes.includes(parseInt(localStorage.getItem('userId')))) {
		imageSource.src = './assets/redHeart.svg'
	} else {
		imageSource.src = './assets/white_heart.svg'
	}
}

// Loading up what colour the heart should be 
const loadingHeart = (selected) => {
	const imageSource = document.getElementById('like_button');
	getApiCall('thread', 'id=' + selected.id, localStorage.getItem('token'))
	.then((response) => {
		let likes = response.likes;
		changingHeart(likes, imageSource);
	}) 
}

// Loading up if watch/unwatch
const loadingWatch = (selected) => {
	const watchText = document.getElementById('watch_text');
	getApiCall('thread', 'id=' + selected.id, localStorage.getItem('token'))
	.then((response) => {
		let watchees = response.watchees;
		if (watchees.includes(parseInt(localStorage.getItem('userId')))) {
			watchText.textContent = 'Unwatch';
		} else {
			watchText.textContent = 'Watch';
		}
	}) 
}

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

const showThread = (sideBarItem) => {
	const threadId = sideBarItem.id;
	console.log("showing thread " + threadId);
	getApiCall('thread', 'id=' + threadId, localStorage.getItem('token'))
	.then((response) => {
		console.log(response);
		// Setting the title
		document.getElementById('thread_title').textContent = response.title;

		// Setting the likes
		let likes = response.likes.length;
		document.getElementById('thread_likes').textContent = likes;

		// Setting the thread content
		const content = document.getElementById('thread_content');
		content.textContent = response.content;

		// Setting the thread date
		document.getElementById('thread_date').textContent = formatDate(response.createdAt);
		// TODO get creatorId and find the name, grab name from selected

		// Setting the public/private text
		if (response.isPublic) {
			sideBarItem.classList.add('isPublic');
			document.getElementById('public_text').textContent = 'Public';
		} else {
			sideBarItem.classList.remove('isPublic');
			document.getElementById('public_text').textContent = 'Private';
		}

		// Setting the locked text
		if (response.lock) {
			sideBarItem.classList.add('locked');
			document.getElementById('lock_text').textContent = 'This thread is locked.';
		} else {
			document.getElementById('lock_text').textContent = '';
		}

		// Loading the heart if its red or empty
		loadingHeart(sideBarItem);

		// Loading watch/unwatch text
		loadingWatch(sideBarItem);

		content.style.maxHeight = '400px';
		
		// Loading comments
		loadComments(sideBarItem);

		// Giving edit/delete button on page
		const editButton = document.getElementById('edit_container');
		const delButton = document.getElementById('bin_container');
		if (response.creatorId === parseInt(localStorage.getItem('userId')) || stringToBool(localStorage.getItem('isAdmin'))) {
			editButton.style.visibility = "visible";
			delButton.style.visibility = "visible";
		} else {
			editButton.style.visibility = "hidden";
			delButton.style.visibility = "hidden";
		}
		if (sideBarItem.classList.contains("locked")) {
			editButton.style.visibility = "hidden";
		}
		const editScreen = document.getElementById('edit_section');
		editScreen.classList.remove("active");
		// TODO still have to check if admin with PUT user/admin
		switchAppScreen('thread_screen');

		// Checking if the view More button should be loaded 
		const viewMoreButton = document.getElementById('view_more_threads');
		if (content.scrollHeight > content.clientHeight) {
			viewMoreButton.style.display = 'block';
		} else {
			viewMoreButton.style.display = 'none';
		}
	})
}

// Selecting a thread
const selectThread = (element) => {
	console.log("were selecting");
	const sideBarList = document.getElementById('threads_sidebar');
	const listItems = sideBarList.querySelectorAll('li');
	listItems.forEach(item => item.classList.remove('selected'));
	if (element.parentElement && element.parentElement.classList.contains('sidebar-item')) {
		element.parentElement.classList.add('selected');
		showThread(element.parentElement);
	} else {
		element.classList.add('selected');
		showThread(element);
	}
}

const loadComments = (selected) => {
	const id = selected.id;
	getApiCall('comments', 'threadId=' + id, localStorage.getItem('token'));
}

// "694650": {
// 	"id": 694650,
// 	"creatorId": 77770,
// 	"threadId": 768696,
// 	"parentCommentId": 516748,
// 	"content": "Sweet I'll take that",
// 	"createdAt": "2024-10-20T03:12:58.375Z",
// 	"likes": {}
// },

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

document.getElementById("bin_container").addEventListener('click', () => {
	const sideBar = document.getElementById('threads_sidebar');
	const selected = document.getElementsByClassName('selected')[0];
	// When showThread runs, it already checks if the button is available for admin/owner
	const id = selected.id;
	deleteApiCall('thread', JSON.stringify({id}), localStorage.getItem('token'))
	.then(() => {
		sideBar.removeChild(selected);
		const firstItem = sideBar.firstElementChild;
		selectThread(firstItem);
		const mainSidebar = document.getElementById('main_sidebar');
		mainSidebar.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	})
	
});


// Expand the textarea when "View More" is clicked
document.getElementById("view_more_threads").addEventListener('click', () => {
	const content = document.getElementById('thread_content');
    content.style.maxHeight = 'none';
	document.getElementById('view_more_threads').style.display = 'none';
});


document.getElementById('view_more_button').addEventListener('click', () => {
	const startValue = localStorage.getItem('seenThreads');
    loadThreads(startValue);
});

// Edit Button pressed
document.getElementById('edit_container').addEventListener('click', () => {
	const selected = document.getElementsByClassName('selected')[0];
	if (selected.classList.contains('locked')) {
		console.log("locked so cannot be edited");
		return;
	}
	const threadTitle = document.getElementById('thread_title');
	const threadContent = document.getElementById('thread_content');
	document.getElementById('thread_title_edit').value = threadTitle.textContent; 
	document.getElementById('thread_content_edit').value = threadContent.textContent;
	
	if (selected.classList.contains('isPublic')) {
		document.getElementById('edit_private_checkbox').checked = false;
	} else {
		document.getElementById('edit_private_checkbox').checked = true;
	}
	if (selected.classList.contains('locked')) {
		document.getElementById('edit_lock_checkbox').checked = true;
	} else {
		document.getElementById('edit_lock_checkbox').checked = false;
	}
	console.log("Editing thread.");
	switchAppScreen('edit_section');
});

// Cancel on edit button
document.getElementById('cancel_edit_button').addEventListener('click', () => {
	const editScreen = document.getElementById('edit_section');
	editScreen.classList.remove("active");
	switchAppScreen('thread_screen');
});

// Watch button
document.getElementById('watch_button').addEventListener('click', () => {
	const selected = document.getElementsByClassName('selected')[0];
	const id = selected.id;
	getApiCall('thread', 'id=' + id, localStorage.getItem('token'))
	.then((response) => {
		let watchees = response.watchees;
		if (watchees.includes(parseInt(localStorage.getItem('userId')))) {
			// Unwatching
			const turnon = false;
			const body = JSON.stringify({id, turnon});
			return putApiCall('thread/watch', body, localStorage.getItem('token'))
			.then(() => {
				console.log("unwatched")
				document.getElementById('watch_text').textContent = 'Watch';
			})
		} else {
			// Watching
			const turnon = true;
			const body = JSON.stringify({id, turnon});
			return putApiCall('thread/watch', body, localStorage.getItem('token'))
			.then(() => {
				console.log("watching")
				document.getElementById('watch_text').textContent = 'Unwatch';
			})
		}
	});
});

// Submit on edit
document.getElementById('submit_edit_button').addEventListener('click', () => {
	// call edit api call
	const title = document.getElementById('thread_title_edit').value; 
	const content = document.getElementById('thread_content_edit').value;
	const isPublic = !(document.getElementById('edit_private_checkbox').checked);
	const lock = document.getElementById('edit_lock_checkbox').checked;
	const selected = document.getElementsByClassName('selected')[0];
	const id = parseInt(selected.id);
	const body = JSON.stringify({id, title, isPublic, lock, content});
	console.log(body);
	putApiCall('thread', body, localStorage.getItem('token'))
	.then(() => {
		showThread(selected);
		switchAppScreen('thread_screen');
		console.log("Updated thread successfully.");
	})
});

// Like button
document.getElementById('like_button').addEventListener('click', () => {
	const selected = document.getElementsByClassName('selected')[0];
	if (selected.classList.contains('locked')) {
		console.log("Can't like, locked.");
		return;
	}
	const imageSource = document.getElementById('like_button');
	const id = selected.id;
	getApiCall('thread', 'id=' + selected.id, localStorage.getItem('token'))
	.then((response) => {
		let likes = response.likes;
		if (likes.includes(parseInt(localStorage.getItem('userId')))) {
			// Unliking
			const turnon = false;
			const body = JSON.stringify({id, turnon});
			return putApiCall('thread/like', body, localStorage.getItem('token'))
			.then(() => {
				imageSource.src = './assets/white_heart.svg';
			})
		} else {
			// Liking
			const turnon = true;
			const body = JSON.stringify({id, turnon});
			return putApiCall('thread/like', body, localStorage.getItem('token'))
			.then(() => {
				imageSource.src = './assets/redHeart.svg'
			})
		}
	}).then(() => {
		showThread(selected);
	});
});

document.getElementById('sign_in_button').addEventListener('click', () => {
    const email = document.getElementById('sign_in_email').value;
    const password = document.getElementById('sign_in_password').value;
    const body = JSON.stringify({email, password});

    console.log(body);
    authCall('auth/login', body);
});

document.getElementById('accept_error_button').addEventListener('click', () => {
	document.getElementById('error_popup').classList.add('hidden');
})

document.getElementById('sign_up_button').addEventListener('click', () => {
    const email = document.getElementById('register_email').value;
    const name = document.getElementById('register_name').value;
    const password = document.getElementById('register_password').value;
	const confirmedPW = document.getElementById('confirm_password').value;
	if (password !== confirmedPW) {
		showError(400, "Passwords do not match.");
		return;
	}
	console.log("Password confirmed");
    const body = JSON.stringify({email, password, name});

    console.log(body);
    authCall('auth/register', body);
});

document.getElementById('sign_up').addEventListener('click', () => {
	document.getElementById('sign_in_email').value = '';
    document.getElementById('sign_in_password').value = '';
	switchScreen('register_screen');
});
document.getElementById('back_to_login_button').addEventListener('click', () => {
	document.getElementById('register_email').value = '';
    document.getElementById('register_name').value = '';
    document.getElementById('register_password').value = '';
	document.getElementById('confirm_password').value = '';
	switchScreen('login_screen');
});
document.getElementById('logout_button').addEventListener('click', () => {
	localStorage.setItem('token', '');
	localStorage.setItem('userId', '');
	localStorage.setItem('activeScreen', 'login_screen');
	localStorage.setItem('seenThreads', 0);
	document.getElementById('view_more_button').style.visibility = "visible";
	const sidebarList = document.getElementById('threads_sidebar');
	while (sidebarList.firstChild) {
		sidebarList.removeChild(sidebarList.firstChild);
	}
	switchScreen('login_screen');
});

document.getElementById('dashboard_text').addEventListener('click', () => {
	switchAppScreen('dashboard_screen');
});

document.getElementById('create_icon').addEventListener('click', () => {
	switchAppScreen('create_thread_screen');
});

document.getElementById('threads_sidebar').addEventListener('click', (event) => {
	console.log("you clicked")
	if (event.target && event.target.nodeName === 'LI' || event.target.nodeName === 'P'
		|| event.target.nodeName === 'B'
	) {
		selectThread(event.target);
    }
});

document.getElementById('create_thread_submit').addEventListener('click', () => {
	const title = document.getElementById('create_thread_title').value;
    const content = document.getElementById('create_thread_content').value;
    const isPublic = !(document.getElementById('private_checkbox').checked);
	const body = JSON.stringify({title, isPublic, content});
	const threadDetails = createThreadCall('thread', body, localStorage.getItem('token'))
	.then((data) => {
		document.getElementById('create_thread_title').value = '';
		document.getElementById('create_thread_content').value = '';
		document.getElementById('private_checkbox').checked = false;
		return getApiCall('thread', 'id=' + data.id, localStorage.getItem('token'));
	});

	threadDetails.then((result) => {
		console.log(result.creatorId);
		return getApiCall('user', 'userId=' + result.creatorId, localStorage.getItem('token')).then((creator) => {
			console.log(creator.name);
			console.log(threadDetails);
			
			const listItem = createThreadListItem(
				creator.name,
				result.likes,               
				result.title,
				result.createdAt,
				result.id,
				"top"
			);
			selectThread(listItem);
			const sidebar = document.getElementById('main_sidebar');
			sidebar.scrollTo({
				top: 0,
				behavior: 'smooth'
			});
		})
	});
});


// API Calls
const authCall = (path, body) => {
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
			switchScreen('app_screen');
			switchAppScreen('dashboard_screen');
			return Promise.resolve(data);
		}
	})
};

const createThreadCall = (path, body, token) => {
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
		return Promise.reject(error);
    });
};

const getApiCall = (path, queryString, token) => {
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
const putApiCall = (path, body, token) => {
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

const deleteApiCall = (path, body, token) => {
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