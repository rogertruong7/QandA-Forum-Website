/**
 * Given a js file object representing a jpg or png image, such as one taken
 * from a html file input element, return a promise which resolves to the file
 * data as a data url.
 * More info:
 *   https://developer.mozilla.org/en-US/docs/Web/API/File
 *   https://developer.mozilla.org/en-US/docs/Web/API/FileReader
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 * 
 * Example Usage:
 *   const file = document.querySelector('input[type="file"]').files[0];
 *   console.log(fileToDataUrl(file));
 * @param {File} file The file to be read.
 * @return {Promise<string>} Promise which resolves to the file as a data url.
 */
export function fileToDataUrl(file) {
    const validFileTypes = [ 'image/jpeg', 'image/png', 'image/jpg' ]
    const valid = validFileTypes.find(type => type === file.type);
    // Bad data, let's walk away.
    if (!valid) {
        throw Error('provided file is not a png, jpg or jpeg image.');
    }
    
    const reader = new FileReader();
    const dataUrlPromise = new Promise((resolve,reject) => {
        reader.onerror = reject;
        reader.onload = () => resolve(reader.result);
    });
    reader.readAsDataURL(file);
    return dataUrlPromise;
}

export const truncateText = (text, maxLength = 20) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export const formatDate = (isoString) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export const stringToBool = (str) => {
    if (typeof str !== 'string') {
        return false; 
    }
    
    const lowerStr = str.toLowerCase();
    
    if (lowerStr === 'true') {
        return true;
    } else if (lowerStr === 'false') {
        return false;
    }
    
    return false;
};

export 
const timeSinceComment = (datetime) => {
    const commentDate = new Date(datetime);
    const currentDate = new Date();
    const diffMs = currentDate - commentDate;

    if (diffMs < 60000) { // less than 1 minute
        return 'Just now';
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) {
        if (diffMinutes === 1) {
            return '1 minute ago';
        } else {
            return `${diffMinutes} minutes ago`;
        }
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        if (diffHours === 1) {
            return '1 hour ago';
        } else {
            return `${diffHours} hours ago`;
        }
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) { 
        if (diffDays === 1) {
            return '1 day ago';
        } else {
            return `${diffDays} days ago`;
        }
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) {
        return '1 week ago';
    } else {
        return `${diffWeeks} weeks ago`;
    }
}