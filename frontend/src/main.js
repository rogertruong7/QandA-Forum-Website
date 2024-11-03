import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, truncateText, formatDate, stringToBool, timeSinceComment } from './helpers.js';
import { authCall, createApiCall, getApiCall, putApiCall } from './server.js';

console.log('Let\'s go!');

// Remembers what screen you were on
window.onload = () => {
    const activeScreen = localStorage.getItem('activeScreen') || 'login_screen'; // Default to login_screen
    switchScreen(activeScreen);
};

// Checking admin status every 1 minute if on a screen that isn't login or register
const pollForAdminStatus = () => {
	const activeScreen = localStorage.getItem('activeScreen');
	if (activeScreen === 'login_screen' || activeScreen === 'register_screen') {
		return;
	}
    getApiCall('user', 'userId=' + localStorage.getItem('userId'), localStorage.getItem('token'))
    .then((response) => {
        localStorage.setItem('isAdmin', response.admin);
        console.log("Admin status is: ", response.admin);
    })
    .catch((error) => {
        console.error("Error while fetching admin status:", error);
    });
};

setInterval(pollForAdminStatus, 60000);

// Switching screens 
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
	
	// Checking if theres any more threads, to remove view more button
	threadDetails.then((t) => {
		let newStartValue = parseInt(startValue) + t.length;
		const newQueryString = 'start=' + newStartValue;
		return getApiCall('threads', newQueryString, localStorage.getItem('token'));
	})
	.then((t) => {
		if (t.length === 0) {
			document.getElementById('view_more_button').style.visibility = "hidden"; 
		}

	});
}

// Create a thread list item on the side bar
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
	nameParagraph.id = id + '-authorName';

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

// Switching screens while the header and sidebar are up
const switchAppScreen = (newScreenId) => {
    const screens = document.querySelectorAll('.appScreen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const newScreen = document.getElementById(newScreenId);
    newScreen.classList.add('active');
}

// Showing error popup
export const showError = (number, string) => {
	document.getElementById('error_title').textContent = 'ERROR ' + number;
	document.getElementById('error_description').textContent = string;
	const errorPopup = document.getElementById('error_popup');
	errorPopup.classList.remove('hidden');
	throw new Error(`Stop`);
}

// Changing heart colour and like number
const changingHeart = (likes, imageSource) => {
	if (likes.includes(parseInt(localStorage.getItem('userId')))) {
		imageSource.src = './assets/redHeart.svg'
	} else {
		imageSource.src = './assets/white_heart.svg'
	}
	document.getElementById('thread_likes').textContent = likes.length;
}

// Loading up what colour the heart should be 
const loadingHeart = (path, queryString, imageSource) => {
	getApiCall(path, queryString, localStorage.getItem('token'))
	.then((response) => {
		let likes = response.likes;
		changingHeart(likes, imageSource);
	}) 
}

// Changing heart colour and like number for comments
const changingCommentHeart = (likes, likeButton) => {
	if (likes.includes(parseInt(localStorage.getItem('userId')))) {
		likeButton.src = './assets/redHeart.svg'
	} else {
		likeButton.src = './assets/white_heart.svg'
	}
	likeButton.parentElement.querySelector(".comments_like_number").textContent = likes.length;
}

// Loading up what colour the heart should be for comments
const loadingCommentHeart = (likeButton, id, threadId) => {
	getApiCall('comments', 'threadId=' + threadId, localStorage.getItem('token'))
	.then((response) => {
		const comment = response.find(comment => comment.id === parseInt(id));
		if (comment === null) {
			return;
		}
		let likes = comment.likes;
		changingCommentHeart(likes, likeButton);
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

// Showing the thread on the website, building the parts
const showThread = (sideBarItem) => {
	const threadId = sideBarItem.id;
	console.log("Showing thread " + threadId);
	getApiCall('thread', 'id=' + threadId, localStorage.getItem('token'))
	.then((response) => {
		// Setting the title
		document.getElementById('thread_title').textContent = response.title;

		// Setting the likes
		let likes = response.likes.length;
		document.getElementById('thread_likes').textContent = likes;

		// Setting the thread content
		const content = document.getElementById('thread_content');
		content.textContent = response.content;

		// Setting the thread date
		document.getElementById('thread_date').textContent = timeSinceComment(response.createdAt) + ' | ' + formatDate(response.createdAt);

		// TODO get creatorId and find the name, grab name from selected
		const idOfName = threadId + '-authorName';
		const name = document.getElementById(idOfName);
		const nameOnThread = document.querySelector('.name_on_thread');
		nameOnThread.id = response.creatorId + '-author';
		nameOnThread.textContent = name.textContent;

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
		const queryString = 'id=' + sideBarItem.id;
		const imageSource = document.getElementById("like_button");
		loadingHeart('thread', queryString, imageSource);

		// Loading watch/unwatch text
		loadingWatch(sideBarItem);
		
		content.style.maxHeight = '400px';
		
		// Loading comments
		const addComment = document.getElementById('beFirst_container');
		const lockedComment = document.getElementById('lockedComment');
		if (sideBarItem.classList.contains('locked')) {
			addComment.style.display = 'none';
			lockedComment.style.display = 'block';
			
		} else {
			addComment.style.display = 'block';
			lockedComment.style.display = 'none';
		}
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

// Function that creates the comment on the page
const createComment = (pfp, name, comment, threadId) => {
	console.log(`creating comment`);
	const id = comment.id;
	const parentCommentId = comment.parentCommentId;
	const content = comment.content;
	const createdAt = comment.createdAt;
	const creatorId = comment.creatorId;

	// Cloning the template comment
	const placeHolderComment = document.getElementById('comment0');
	const commentItem = placeHolderComment.cloneNode(true);
	let level = 0;

	// If the comment has parents, find its level in the id
	let parentElement = null;
	if (parentCommentId !== null) {
		const comments = document.getElementsByClassName('comment');
		parentElement = Array.from(comments).find(element => element.id.includes(parentCommentId));
		const parentLevel = parseInt(parentElement.id.split('level')[1]);
		level = parentLevel + 1;
	}
	if (creatorId === parseInt(localStorage.getItem('userId')) || stringToBool(localStorage.getItem('isAdmin'))) {
		commentItem.querySelector('.comment_edit_text').style.visibility = 'visible';
	} else {
		commentItem.querySelector('.comment_edit_text').style.visibility = 'hidden';
	}
	// Setting the id to contain the level
	commentItem.id = id + 'level' + level;
	const nameItem = commentItem.querySelector('.comments_name');
	nameItem.textContent = name;
	nameItem.id = creatorId + '-name';
	commentItem.querySelector('.comment_text').textContent = content;
	commentItem.querySelector('.comment_date').textContent = timeSinceComment(createdAt);
	const likeButton = commentItem.querySelector('.comments_like_button')
	likeButton.id = id + '-likebutton';
	commentItem.querySelector('.reply_text').id = id + '-replybutton';
	commentItem.querySelector('.comment_edit_text').id = id + '-editbutton';
	commentItem.querySelector('.reply_content_container').id = id + '-reply_container';
	commentItem.querySelector('.comment_edit_container').id = id + '-editContainer';
	commentItem.querySelector('.comments_pfp').id = creatorId + '-profile';
	
	if (pfp !== null) {
		commentItem.querySelector('.comments_pfp').src = pfp;
	}
	commentItem.style.display = 'block';

	// Loading heart colour
	loadingCommentHeart(likeButton, id, threadId);

	// Setting the indentation
	const marginSize = level * 45;
	const marginLeftString = marginSize + 'px';
	commentItem.querySelector('.left_comments_container').style.paddingLeft = marginLeftString;

	// We use prepend, because we need to add the oldest comment first.
	if (level !== 0 && parentElement !== null) {
		parentElement.querySelector('.indented_comment_list').prepend(commentItem);
	} else {
		document.getElementById('comments_list').prepend(commentItem);
	}
}

// Loading up the comments on a thread
const loadComments = (selected) => {
	let id = selected.id;
	const commentsList = document.getElementById('comments_list');
	const comments = commentsList.querySelectorAll('.comment');
	for (const comment of comments) {
		if (comment.id !== 'comment0' && comment.id.includes('level0')) {
			commentsList.removeChild(comment);
		}
	}
	getApiCall('comments', 'threadId=' + id, localStorage.getItem('token'))
	.then((response) => {
		// Thread has no comments
		if (response.length === 0) {
			document.getElementById('beFirst').style.display = 'block';
			const comments = document.getElementsByClassName('comment');
			for (const comment of comments) {
				comment.style.display = 'none';
			}
		} else {
			document.getElementById('beFirst').style.display = 'none';
		}
		// Sorting the comments by date
		response.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
		const threadId = id;
		// Iterating through the comments, using reduce to ensure the promise is finished before next
		response.reduce((promiseChain, comment) => {
			return promiseChain
			.then(() => {
				return getApiCall('user', 'userId=' + comment.creatorId, localStorage.getItem('token'));
			})
			.then((userData) => {
				return createComment(userData.image, userData.name, comment, threadId);
			})
		}, Promise.resolve());
	});
}

// Creates one thread on a profile
const createThreadProfileItem = (threadDetails, isWatching) => {
	// Title
	const titleParagraph = document.createElement('b');
    titleParagraph.textContent = threadDetails.title;

    // Likes
    const likesParagraph = document.createElement('p');
    likesParagraph.textContent = threadDetails.likes.length + ' ❤️';

	const likesCommentsContainers = document.createElement('div');
	likesCommentsContainers.appendChild(likesParagraph);
	likesCommentsContainers.classList.add('like_comment_container');
    
    
	// Get creator name
	getApiCall('user', 'userId=' + threadDetails.creatorId, localStorage.getItem('token'))
	.then((creator) => {
		// Name
    	const nameParagraph = document.createElement('p');
		nameParagraph.textContent = 'Posted by: ' + creator.name;

		// Content
		const contentParagraph = document.createElement('p');
		contentParagraph.textContent = threadDetails.content;
		
		// Append paragraphs to list item
		const listItem = document.createElement('div');
		listItem.classList.add('thread_profile');
		
		listItem.appendChild(titleParagraph);
		listItem.appendChild(nameParagraph);
		listItem.appendChild(contentParagraph);
		listItem.appendChild(likesCommentsContainers);
		return listItem;
		
	})
	.then((listItem) => {
		// Getting the number of comments
		getApiCall('comments', "threadId=" + threadDetails.id, localStorage.getItem('token'))
		.then((comments) => {
			const commentParagraph = document.createElement('p');
			if (comments.length === 1) {
				commentParagraph.textContent = comments.length + ' comment';
			} else {
				commentParagraph.textContent = comments.length + ' comments';
			}
			likesCommentsContainers.appendChild(commentParagraph);
			
			if (!isWatching) {
				const threadList = document.getElementById("threads_profile_list");
				threadList.append(listItem);
			} else {
				const threadList = document.getElementById("watchings_profile_list");
				threadList.append(listItem);
			}
		})
	});
}

// Recursive function to get all threads
const retrieveAllThreads = (allThreads, i) => {
	return getApiCall('threads', 'start=' + i, localStorage.getItem('token'))
	.then(threads => {
		if (threads.length === 0) {
			return allThreads;
		}
		threads.forEach(thread =>  allThreads.push(thread));
		i += threads.length;
		return retrieveAllThreads(allThreads, i);
	});
}

// Shows threads on profile of user
const showThreadsOnProfile = (userDetails) => {
	const userId = userDetails.id;
	let i = 0;
	let allThreads = [];
	retrieveAllThreads(allThreads, i)
	.then((threads) => {
		const threadList = threads.map(threadId => {
			return getApiCall('thread', 'id=' + threadId, localStorage.getItem('token'));
		});
		return Promise.all(threadList);
	}).then((response) => {
		response.forEach(thread => {
			const creatorId = thread.creatorId;
			if (creatorId !== userId) {
				return;
			}
			createThreadProfileItem(thread, false);
		})
	});
} 

// Show threads being watched on profile
const showWatchingOnProfile = (threadsWatching) => {
	const watchingList = document.getElementById("watchings_profile_list");
	const previousThreads = watchingList.querySelectorAll('.thread_profile');
	previousThreads.forEach(element => {
		element.parentNode.removeChild(element);
	});
	const postedThreadsList = document.getElementById("threads_profile_list");
	const previousThreadsPosted = postedThreadsList.querySelectorAll('.thread_profile');
	previousThreadsPosted.forEach(element => {
		element.parentNode.removeChild(element);
	});

	threadsWatching.forEach((threadId) => {
		getApiCall('thread', 'id=' + threadId, localStorage.getItem('token'))
		.then((threadDetails) => {
			createThreadProfileItem(threadDetails, true);
		})
	})
} 

// Showing the profile page
const showProfile = (userId) => {
	// Showing which values can be updated depending on admin/owner
	if (userId === localStorage.getItem('userId')) {
		document.getElementById('update_profile_form').style.display = "flex";
		document.getElementById('right_container_profile').style.display = 'block';
		document.getElementById('right_container_profile').style.height = '800px';
		document.getElementById('change_permissions_button').style.display = 'none';
		document.getElementById('permissions_update_container').style.display = 'none';
	} else {
		document.getElementById('update_profile_form').style.display = 'none';
		if (stringToBool(localStorage.getItem('isAdmin'))) {
			document.getElementById('change_permissions_button').style.display = 'flex';
			document.getElementById('permissions_update_container').style.display = 'block';
			document.getElementById('right_container_profile').style.height = '250px';
		} else {
			document.getElementById('change_permissions_button').style.display = 'none';
			document.getElementById('permissions_update_container').style.display = 'none';
			document.getElementById('right_container_profile').style.display = 'none';
			document.getElementById('right_container_profile').style.height = '800px';
		}
	}
	document.getElementById('change_password_input').value = '';
	document.getElementById('confirm_password_input').value = '';
	document.getElementById('change_email_input').value = '';
	document.getElementById('change_name_input').value = '';
	document.getElementById('pfpUpload').value = '';

	getApiCall('user', 'userId=' + userId, localStorage.getItem('token'))
	.then((response) => {
		const email = response.email;
		const name = response.name;
		const image = response.image;
		const admin = response.admin;
		const threadsWatching = response.threadsWatching;
		document.getElementById('name_profile').textContent = name;
		document.getElementById('email_profile').textContent = 'Email: ' + email;
		if (admin) {
			document.getElementById('admin_profile').textContent = "Admin";
		} else {
			document.getElementById('admin_profile').textContent = "User";
		}
		const pfp = document.querySelector('#profile_info img');
		pfp.id = userId + '-pfp';
		if (image !== null) {
			pfp.src = image;
		}
		showWatchingOnProfile(threadsWatching);
		const sideBarList = document.getElementById('threads_sidebar');
		const listItems = sideBarList.querySelectorAll('li');
		listItems.forEach(item => item.classList.remove('selected'));
		showThreadsOnProfile(response);
	})	
}

// Function to get the email value
const updateEmail = () => {
    const email = document.getElementById('change_email_input').value;
	const body = JSON.stringify({email});
    return putApiCall('user', body, localStorage.getItem('token'));
};

// Function to get the password value
const updatePassword = () => {
    const password = document.getElementById('change_password_input').value;
	const body = JSON.stringify({password});
    return putApiCall('user', body, localStorage.getItem('token'));
};

// Function to get the name value
const updateName = () => {
    const name = document.getElementById('change_name_input').value;
	const body = JSON.stringify({name});
    return putApiCall('user', body, localStorage.getItem('token'));
};

// Function to get the image input value
const updateImageDataUrl = () => {
    const imageInput = document.getElementById('pfpUpload');
    if (imageInput.files.length > 0) {
        const file = imageInput.files[0];
        return fileToDataUrl(file)
		.then(dataUrl => {
            const image = dataUrl;
            const body = JSON.stringify({image});
            return putApiCall('user', body, localStorage.getItem('token'));
        })
    }
    return Promise.resolve('');
};

//////////////////////////////////////////////////////////////////////////////
////////////////////// Listeners /////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

document.getElementById('toggle_sidebar').addEventListener('click', function () {
    const sidebar = document.getElementById('main_sidebar');

    // Check if the sidebar is currently off-screen
    if (sidebar.style.left === '0px') {
        // Move the sidebar out of view
		document.getElementById('toggle_sidebar').style.left = '0px';
        sidebar.style.left = '-250px';
    } else {
		document.getElementById('toggle_sidebar').style.left = '252px';
        // Move the sidebar into view
        sidebar.style.left = '0';
    }
});

// Cancel and Save actions for Change Picture
document.getElementById("cancel_update_button_pfp").addEventListener('click', () => {
    document.getElementById('pfpUpload').value = '';
});

document.getElementById("submit_update_button_pfp").addEventListener('click', () => {
    const fileInput = document.getElementById('pfpUpload');
    if (fileInput.files.length > 0) {
        updateImageDataUrl()
		.then(() => {
			setTimeout(showProfile(localStorage.getItem('userId')), 500);
		});
    } else {
        showError(400, 'Please upload a file.');
    }
});

// Cancel and Save actions for Change Name
document.getElementById("cancel_update_button_name").addEventListener('click', () => {
    document.getElementById('change_name_input').value = '';
});

document.getElementById("submit_update_button_name").addEventListener('click', () => {
    const nameValue = document.getElementById('change_name_input').value;
    if (nameValue) {
        console.log("Name updated to:", nameValue);
        updateName()
		.then(() => {
			setTimeout(showProfile(localStorage.getItem('userId')), 500);
		});
    } else {
		showError(400, "Please enter a name.");
    }
});

// Cancel and Save actions for Change Email
document.getElementById("cancel_update_button_email").addEventListener('click', () => {
    document.getElementById('change_email_input').value = '';
});

document.getElementById("submit_update_button_email").addEventListener('click', () => {
    const emailValue = document.getElementById('change_email_input').value;
    if (emailValue) {
        console.log("Email updated to:", emailValue);
		updateEmail()
		.then(() => {
			setTimeout(showProfile(localStorage.getItem('userId')), 500);
		});
    } else {
		showError(400, "Please enter an email.");
    }
});

// Cancel and Save actions for Change Password
document.getElementById("cancel_update_button_password").addEventListener('click', () => {
    document.getElementById('change_password_input').value = '';
    document.getElementById('confirm_password_input').value = '';
});

document.getElementById("submit_update_button_password").addEventListener('click', () => {
    const passwordValue = document.getElementById('change_password_input').value;
    const confirmPasswordValue = document.getElementById('confirm_password_input').value;
    if (passwordValue && confirmPasswordValue) {
        if (passwordValue === confirmPasswordValue) {
            updatePassword()
			.then(() => {
				setTimeout(showProfile(localStorage.getItem('userId')), 500);
			});
        } else {
            showError(400, "Passwords do not match.");
        }
    } else {
        showError(400, "Please enter a password.");
    }
});

// Save admin/user
document.getElementById("submit_update_button_permissions").addEventListener('click', () => {
    const selectedPermission = document.getElementById('permissionsSelect').value;
    if (selectedPermission) {
		let turnon = null;
        if (selectedPermission === 'admin') {
			turnon = true;
		} else {
			turnon = false;
		}
		const pfp = document.querySelector('#profile_info img');
		const userId = parseInt(pfp.id.replace('-pfp', ''));
		const body = JSON.stringify({userId, turnon});
		putApiCall('user/admin', body, localStorage.getItem('token'))
		.then(() => {
			setTimeout(showProfile(userId), 500);
		});
    } else {
		showError(400, "Please select a permission level.");
    }
});

// Name of thread gets clicked takes you to profile
document.getElementById("like_name_container").addEventListener('click', (event) => {
	if (!event.target.classList.contains('name_on_thread')) {
		return;
	}
	const elementId = event.target.id;
	const userId = elementId.split('-')[0];
	showProfile(userId);
	switchAppScreen('profile_section');
});

// Profile picture and name in comments take you to profile
document.getElementById("comments_list").addEventListener('click', (event) => {
	if (!event.target.classList.contains('comments_name') && !event.target.classList.contains('comments_pfp')) {
		return;
	}
	const elementId = event.target.id;
	const userId = elementId.split('-')[0];
	showProfile(userId);
	switchAppScreen('profile_section');
});

// Switch to posted on profile
document.getElementById("threads_posted_button").addEventListener('click', (e) => {
	const postsButton = e.target;
	postsButton.classList.add("active");
	const watchingButton = document.getElementById("threads_watching_button");
	watchingButton.classList.remove("active");
	document.getElementById('threads_profile_list').style.display = 'block';
	document.getElementById('watchings_profile_list').style.display = 'none';
});

// Switch to watching on profile
document.getElementById("threads_watching_button").addEventListener('click', (e) => {
	const watchingButton = e.target;
	watchingButton.classList.add("active");
	const postButton = document.getElementById("threads_posted_button");
	postButton.classList.remove("active");
	document.getElementById('threads_profile_list').style.display = 'none';
	document.getElementById('watchings_profile_list').style.display = 'block';
});

// Takes you to profile page
document.getElementById("view_profile_button").addEventListener('click', () => {
	const profile_popup = document.getElementById('profile_popup');
	profile_popup.style.visibility = "hidden";
	console.log("Opening profile section.");
	showProfile(localStorage.getItem('userId'));
	const sideBarList = document.getElementById('threads_sidebar');
	const listItems = sideBarList.querySelectorAll('li');
	listItems.forEach(item => item.classList.remove('selected'));
	switchAppScreen('profile_section');
});

// Like comment button
document.getElementById("comments_list").addEventListener('click', (event) => {
	const selected = document.querySelector('.selected');
	if (selected.classList.contains('locked')) {
		console.log("locked so cannot be liked");
		return;
	}
	if (!event.target.classList.contains('comments_like_button')) {
		return;
	}
	const likeButton = event.target;
	const threadId = selected.id;
	const id = likeButton.id.replace('-likebutton', '');
	getApiCall('comments', 'threadId=' + threadId, localStorage.getItem('token'))
	.then((response) => {
		const comment = response.find(comment => comment.id === parseInt(id));
		if (comment === null) {
			return;
		}
		let likes = comment.likes;
		if (likes.includes(parseInt(localStorage.getItem('userId')))) {
			// Unliking
			const turnon = false;
			
			const body = JSON.stringify({id, turnon});
			return putApiCall('comment/like', body, localStorage.getItem('token'))
			.then(() => {
				likeButton.src = './assets/white_heart.svg';
				loadingCommentHeart(likeButton, id, threadId);
			})
		} else {
			// Liking
			const turnon = true;
			const body = JSON.stringify({id, turnon});
			return putApiCall('comment/like', body, localStorage.getItem('token'))
			.then(() => {
				likeButton.src = './assets/redHeart.svg'
				loadingCommentHeart(likeButton, id, threadId);
			})
		}
	});
});

// Cancel edit listener 
document.getElementById("comments_list").addEventListener('click', (event) => {
	if (!event.target.classList.contains('cancel_commentedit_button')) {
		return;
	}
	console.log('Cancel edit button clicked');
	const cancelButton = event.target;
	const editContainer = cancelButton.parentElement.parentElement;
	editContainer.style.display = 'none';
	const commentContent = editContainer.parentElement.querySelector('.comment_text');
	const editContent = editContainer.parentElement.querySelector('.comment_edit_content');

	editContent.value = '';
	commentContent.style.display = 'block';
});


// Submit edit listener
document.getElementById("comments_list").addEventListener('click', (event) => {
	if (!event.target.classList.contains('submit_edited_comment_button')) {
		return;
	}
	console.log('Submit edit button clicked');
	const submitButton = event.target;
	const editContainer = submitButton.parentElement.parentElement;
	const editContent = editContainer.querySelector('.comment_edit_content');
	const commentContent = editContainer.parentElement.querySelector('.comment_text');
	const content = editContent.value;
	const selected = document.querySelector('.selected');
	const id = parseInt(editContainer.id.replace('-editContainer', ''));
	const body = JSON.stringify({id, content});
	putApiCall('comment', body, localStorage.getItem('token'))
	.then(() => {
		loadComments(selected);
		editContent.value = '';
		editContainer.style.display = 'none';
		commentContent.style.display = 'block';
	})
	
});

// Edit comment listener
document.getElementById("comments_list").addEventListener('click', (event) => {
	const selected = document.querySelector('.selected');
	if (selected.classList.contains('locked')) {
		console.log("locked so cannot be edited");
		return;
	}
	if (!event.target.classList.contains('comment_edit_text')) {
		return;
	}
	console.log('Edit button clicked');
	const editButton = event.target;
	const parentCommentId = parseInt(editButton.id.replace('-editbutton', ''));
	const editContainerId = parentCommentId + "-editContainer"
	const editContainer = document.getElementById(editContainerId);
	const editContainers = Array.from(document.getElementsByClassName('comment_edit_container'));
	editContainers.forEach(e => {
		if (e.id !== editContainerId) {
			e.style.display = 'none';
		}
	});
	const editTextAreas = Array.from(document.getElementsByClassName('comment_edit_content'));
	editTextAreas.forEach(e => {
		e.value = '';
	});
	const editTextArea = editContainer.querySelector('.comment_edit_content');
	const parentElement = editContainer.parentElement;
	const commentText = parentElement.querySelector('.comment_text');
	if (editContainer.style.display === 'flex') {
		editTextArea.value = '';
		editContainer.style.display = 'none';
		commentText.style.display = 'block';
	} else {
		editTextArea.value = commentText.textContent;
		editContainer.style.display = 'flex';
		commentText.style.display = 'none';
	}
});

// Focusing add comment
document.getElementById("comment_yourself").addEventListener('focus', () => {
	document.getElementById('add_comment_container').style.display = 'flex';
});

// Unfocusing add comment
document.getElementById("comment_yourself").addEventListener('blur', () => {
	setTimeout(() => {
		document.getElementById('add_comment_container').style.display = 'none';
	}, 100);
});

// Cancelling comment
document.getElementById("cancel_comment_button").addEventListener('click', (e) => {
	document.getElementById('comment_yourself').value = '';
});

// Commenting comment
document.getElementById("submit_comment_button").addEventListener('click', () => {
	console.log("commented");
	const content = document.getElementById('comment_yourself').value;
	const selected = document.querySelector('.selected');
	const threadId = selected.id;
	const parentCommentId = null;
	const body = JSON.stringify({content, threadId, parentCommentId});
	createApiCall('comment', body, localStorage.getItem('token'))
	.then(() => {
		loadComments(selected);
	})

	document.getElementById('comment_yourself').value = '';
});

// Cancel reply listener 
document.getElementById("comments_list").addEventListener('click', (event) => {
	if (!event.target.classList.contains('reply_cancel_button')) {
		return;
	}
	console.log('Cancel reply button clicked');
	const cancelButton = event.target;
	const replyContentContainer = cancelButton.parentElement.parentElement;
	replyContentContainer.style.display = 'none';
	const replyContent = replyContentContainer.querySelector('.reply_content');
	replyContent.value = '';
});


// Submit reply listener
document.getElementById("comments_list").addEventListener('click', (event) => {
	if (!event.target.classList.contains('reply_submit_button')) {
		return;
	}
	console.log('Submit reply button clicked');
	const submitButton = event.target;
	const replyContentContainer = submitButton.parentElement.parentElement;
	const replyContent = replyContentContainer.querySelector('.reply_content');
	
	const content = replyContent.value;
	const selected = document.querySelector('.selected');
	const threadId = parseInt(selected.id);
	const parentCommentId = parseInt(replyContentContainer.id.replace('-reply_container', ''));
	const body = JSON.stringify({content, threadId, parentCommentId});
	createApiCall('comment', body, localStorage.getItem('token'))
	.then(() => {
		loadComments(selected);
		replyContent.value = '';
		replyContentContainer.style.display = 'none';
	})
	
});

// Reply to comment listener
document.getElementById("comments_list").addEventListener('click', (event) => {
	const selected = document.querySelector('.selected');
	if (selected.classList.contains('locked')) {
		console.log("locked so cannot be replied");
		return;
	}
	if (!event.target.classList.contains('reply_text')) {
		return;
	}
	console.log('Reply button clicked');
	const replyButton = event.target;
	const parentCommentId = parseInt(replyButton.id.replace('-replybutton', ''));
	const replyTextAreaId = parentCommentId + "-reply_container"
	const replyTextContainer = document.getElementById(replyTextAreaId);
	const replyContainers = Array.from(document.getElementsByClassName('reply_content_container'));
	replyContainers.forEach(r => {
		if (r.id !== replyTextAreaId) {
			r.style.display = 'none';
		}
	});
	const replyTextBoxes = Array.from(document.getElementsByClassName('reply_content'));
	replyTextBoxes.forEach(r => {
		r.value = '';
	});
	if (replyTextContainer.style.display === 'flex') {
		replyTextContainer.style.display = 'none';
	} else {
		replyTextContainer.style.display = 'flex';
	}
});

// Delete thread listener
document.getElementById("bin_container").addEventListener('click', () => {
	const sideBar = document.getElementById('threads_sidebar');
	const selected = document.querySelector('.selected');
	// When showThread runs, it already checks if the button is available for admin/owner
	const id = selected.id;
	deleteApiCall('thread', JSON.stringify({id}), localStorage.getItem('token'))
	.then(() => {
		sideBar.removeChild(selected);
		const firstItem = sideBar.firstElementChild;
		selectThread(firstItem);
	})
});


// Expand the textarea when "View More" is clicked
document.getElementById("view_more_threads").addEventListener('click', () => {
	const content = document.getElementById('thread_content');
    content.style.maxHeight = 'none';
	document.getElementById('view_more_threads').style.display = 'none';
});

// View more threads
document.getElementById('view_more_button').addEventListener('click', () => {
	const startValue = localStorage.getItem('seenThreads');
    loadThreads(startValue);
});

// Edit Button pressed
document.getElementById('edit_container').addEventListener('click', () => {
	const selected = document.querySelector('.selected');;
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
	const selected = document.querySelector('.selected');;
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
	const selected = document.querySelector('.selected');;
	const id = parseInt(selected.id);
	const body = JSON.stringify({id, title, isPublic, lock, content});
	putApiCall('thread', body, localStorage.getItem('token'))
	.then(() => {
		showThread(selected);
		switchAppScreen('thread_screen');
		console.log("Updated thread successfully.");
	})
});

// Like button for threads
document.getElementById('like_button').addEventListener('click', () => {
	const selected = document.querySelector('.selected');;
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
		const queryString = 'id=' + selected.id;
		const imageSource = document.getElementById("like_button");
		loadingHeart('thread', queryString, imageSource);
	});
});

// Sign in on login page
document.getElementById('sign_in_button').addEventListener('click', () => {
    const email = document.getElementById('sign_in_email').value;
    const password = document.getElementById('sign_in_password').value;
    const body = JSON.stringify({email, password});

    authCall('auth/login', body)
	.then(() => {
		switchScreen('app_screen');
		switchAppScreen('dashboard_screen');
	});
});

// Accepting error
document.getElementById('accept_error_button').addEventListener('click', () => {
	document.getElementById('error_popup').classList.add('hidden');
})


// Sign up button
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

    authCall('auth/register', body)
	.then(() => {
		switchScreen('app_screen');
		switchAppScreen('dashboard_screen');
	});;
});

// Sign up button takes you to registration page
document.getElementById('sign_up').addEventListener('click', () => {
	document.getElementById('sign_in_email').value = '';
    document.getElementById('sign_in_password').value = '';
	switchScreen('register_screen');
});

// Back to login button listener
document.getElementById('back_to_login_button').addEventListener('click', () => {
	document.getElementById('register_email').value = '';
    document.getElementById('register_name').value = '';
    document.getElementById('register_password').value = '';
	document.getElementById('confirm_password').value = '';
	switchScreen('login_screen');
});


// Profile button reveal porifle popup
document.getElementById('profile_button').addEventListener('click', () => {
	const profile_popup = document.getElementById('profile_popup');
	if (profile_popup.style.visibility === "visible") {
		profile_popup.style.visibility = "hidden";
	} else {
		profile_popup.style.visibility = "visible";
	}
});

// Close popup for a click anywhere on the screen
document.addEventListener('click', (event) => {
    const profilePopup = document.getElementById('profile_popup');
	const profileButton = document.getElementById('profile_button');
    
    if (!profilePopup.contains(event.target) && !profileButton.contains(event.target) && profilePopup.style.visibility === "visible") {
        profilePopup.style.visibility = "hidden";
    }
});

// Logout button listener
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

// Taking back to dashboard from header text
document.getElementById('dashboard_text').addEventListener('click', () => {
	const sideBarList = document.getElementById('threads_sidebar');
	const listItems = sideBarList.querySelectorAll('li');
	listItems.forEach(item => item.classList.remove('selected'));
	switchAppScreen('dashboard_screen');
});

// Create thread button
document.getElementById('create_icon').addEventListener('click', () => {
	if (document.getElementById('create_thread_screen').classList.contains('active')) {
		document.getElementById('create_thread_screen').classList.remove('active');
		const selected = document.querySelector('.selected');
		if (selected === null) {
			switchAppScreen("dashboard_screen");
		} else {
			switchAppScreen('thread_screen');
		}
	} else {
		switchAppScreen('create_thread_screen');
	}
});

// Clicking on a thread on the sidebar
document.getElementById('threads_sidebar').addEventListener('click', (event) => {
	if (event.target && event.target.nodeName === 'LI' || event.target.nodeName === 'P'
		|| event.target.nodeName === 'B'
	) {
		selectThread(event.target);
    }
});

// Submitting created thread
document.getElementById('create_thread_submit').addEventListener('click', () => {
	const title = document.getElementById('create_thread_title').value;
    const content = document.getElementById('create_thread_content').value;
    const isPublic = !(document.getElementById('private_checkbox').checked);
	const body = JSON.stringify({title, isPublic, content});
	const threadDetails = createApiCall('thread', body, localStorage.getItem('token'))
	.then((data) => {
		document.getElementById('create_thread_title').value = '';
		document.getElementById('create_thread_content').value = '';
		document.getElementById('private_checkbox').checked = false;
		return getApiCall('thread', 'id=' + data.id, localStorage.getItem('token'));
	});

	threadDetails.then((result) => {
		return getApiCall('user', 'userId=' + result.creatorId, localStorage.getItem('token')).then((creator) => {
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
