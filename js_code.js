const HACKER_NEWS_URL = 'https://hacker-news.firebaseio.com/v0';
const POSTS_LIMIT = 30;
let postIds = [];
let currentPage = 0;

const fetchPosts = async () => {
    try {
        const response = await fetch(`${HACKER_NEWS_URL}/topstories.json`);
        postIds = await response.json();
        loadPosts();
    } catch (error) {
        console.error('Error fetching post IDs:', error);
    }
};

const loadPosts = async () => {
    const postsContainer = document.getElementById('posts');
    const start = currentPage * POSTS_LIMIT;
    const end = start + POSTS_LIMIT;

    for (let i = start; i < end && i < postIds.length; i++) {
        const postId = postIds[i];
        const postResponse = await fetch(`${HACKER_NEWS_URL}/item/${postId}.json`);
        const post = await postResponse.json();
        
        const postElement = document.createElement('div');
        postElement.innerHTML = `
            <h2><a href="${post.url}" target="_blank">${post.title}</a></h2>
            <p>By ${post.by} | ${new Date(post.time * 1000).toLocaleString()}</p>
        `;
        postsContainer.appendChild(postElement);

        // Fetch comments if any
        if (post.kids) {
            const commentsContainer = document.createElement('div');
            commentsContainer.style.marginLeft = '20px';
            for (const commentId of post.kids) {
                const commentResponse = await fetch(`${HACKER_NEWS_URL}/item/${commentId}.json`);
                const comment = await commentResponse.json();
                const commentElement = document.createElement('p');
                commentElement.innerHTML = `${comment.text} <br> By ${comment.by} | ${new Date(comment.time * 1000).toLocaleString()}`;
                commentsContainer.appendChild(commentElement);
            }
            postElement.appendChild(commentsContainer);
        }
    }

    currentPage++;
};

const loadMoreButton = document.getElementById('load-more');
loadMoreButton.addEventListener('click', loadPosts);


