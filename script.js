const pageSize = 25;
let currentPage = 0;
let lastID = null;
let existedPosts = new Set();

async function fetchFunc(url) {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0${url}`);
    if (!response.ok) throw new Error(`Error fetching data: ${response.statusText}`);
    return await response.json();
}

async function fetchData() {
    const loadElement = document.getElementById("loading");
    loadElement.style.display = 'block';

    try {
        const postIds = await fetchFunc('/newstories.json');
        if (currentPage === 0) lastID = postIds[0];

        const start = currentPage * pageSize;
        const pageIDs = postIds.slice(start, start + pageSize).filter(id => !existedPosts.has(id));

        const posts = await Promise.all(pageIDs.map(id => fetchFunc(`/item/${id}.json`)));
        const filtered = posts.filter(post => !post.deleted);
        filtered.forEach(displayData);

        currentPage++;
    } catch (error) {
        console.error(error);
    } finally {
        if (filtered.length !== 0) {
            loadElement.style.display = 'none';
        }
    }
}

function displayData(post) {
    if (!post || !post.title) return;

    const listItem = document.createElement('li');
    listItem.className = 'post';
    listItem.innerHTML = createPostHTML(post);
    document.getElementById('posts').appendChild(listItem);

    if (post.descendants > 0) {
        setupCommentToggle(listItem, post);
    }

    existedPosts.add(post.id);
}

function createPostHTML(post) {
    return `
        <a href="${post.url}" class="post-title" target="_blank">
            <label>${post.title}</label>
            <div class='category'>${post.type}</div>
        </a>
        <div class="post-meta">
            <span>${post.score} points</span>
            <span>•</span>
            <span>by ${post.by}</span>
            <span>•</span>
            <span>${timeConverter(post.time)}</span>
            ${post.descendants ? `
                <span>•</span>
                <button class="comment-toggle" data-post-id="${post.id}">
                    ${post.descendants} comments
                </button>
            ` : ''}
        </div>
        <div class="comments" id="comments-${post.id}" style="display: none;"></div>
    `;
}

function setupCommentToggle(listItem, post) {
    const toggleBtn = listItem.querySelector('.comment-toggle');
    const commentsDiv = listItem.querySelector('.comments');

    toggleBtn.addEventListener('click', async () => {
        await loadComments(post.id);
        const isHidden = commentsDiv.style.display === 'none';
        commentsDiv.style.display = isHidden ? 'block' : 'none';
        toggleBtn.style.background = isHidden ? '#4ade80' : 'transparent';
        toggleBtn.style.color = isHidden ? '#111827' : '#4ade80';
    });
}

function timeConverter(timeGiven) {
    const timeElapsed = Math.floor((Date.now() / 1000) - timeGiven);
    const intervals = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 }
    ];

    for (const { unit, seconds } of intervals) {
        const interval = Math.floor(timeElapsed / seconds);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    return 'just now';
}

async function loadComments(postId) {
    try {
        const post = await fetchFunc(`/item/${postId}.json`);
        if (!post.kids) return;

        const commentElement = document.getElementById(`comments-${postId}`);
        const comments = await Promise.all(post.kids.map(id => fetchFunc(`/item/${id}.json`)));

        commentElement.innerHTML = comments
            .filter(comment => !comment.deleted)
            .map(comment => createCommentHTML(comment))
            .join('');
    } catch (error) {
        console.error(error);
    }
}

function createCommentHTML(comment) {
    return `
        <div class="comment">
            ${comment.text}
            <div class="post-meta">
                by ${comment.by} | ${timeConverter(comment.time)}
            </div>
        </div>
    `;
}

document.getElementById('newPostMessage').addEventListener('click', () => {
    resetPage();
    fetchData();
});

function resetPage() {
    currentPage = 0;
    existedPosts.clear();
    document.getElementById('posts').innerHTML = '';
    document.getElementById('newPostMessage').style.display = 'none';
}

window.addEventListener('scroll', debounce(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        fetchData();
    }
}, 250));

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

async function checkNewPosts() {
    try {
        const posts = await fetchFunc('/newstories.json');
        const latestId = posts[0];

        if (latestId > lastID) {
            document.getElementById('newPostMessage').style.display = 'block';
        }
    } catch (error) {
        console.error(error);
    }
}

fetchData();
setInterval(checkNewPosts, 5000);
