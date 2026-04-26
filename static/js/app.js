// Constellation Studio CMS - Frontend Application
const API_BASE = 'http://localhost:5000/api';

// State management
let currentView = null;
let currentEntity = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    setupEventListeners();
});

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        document.getElementById('total-journalists').textContent = data.total_journalists;
        document.getElementById('total-outlets').textContent = data.total_outlets;
        document.getElementById('total-relationships').textContent = data.total_relationships;
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Failed to load statistics');
    }
}

// Setup event listeners for search inputs
function setupEventListeners() {
    // Journalist search
    const journalistSearchInput = document.getElementById('journalist-search-input');
    if (journalistSearchInput) {
        journalistSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performJournalistSearch(journalistSearchInput.value);
            }
        });
    }

    // Outlet search
    const outletSearchInput = document.getElementById('outlet-search-input');
    if (outletSearchInput) {
        outletSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performOutletSearch(outletSearchInput.value);
            }
        });
    }
}

// Show/hide sections
function showSection(sectionId) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        
        // Load data for this section
        if (sectionId === 'cross-platform') {
            loadCrossPlatformJournalists();
        } else if (sectionId === 'top-outlets') {
            loadTopOutlets();
        } else if (sectionId === 'search-journalists') {
            document.getElementById('journalist-search-results').innerHTML = '<p class="loading">Ready to search...</p>';
        } else if (sectionId === 'search-outlets') {
            document.getElementById('outlet-search-results').innerHTML = '<p class="loading">Ready to search...</p>';
        }
    }

    // Hide detail view
    hideDetailView();
}

function showMainNavigation() {
    showSection('cross-platform');
}

// Load cross-platform journalists
async function loadCrossPlatformJournalists() {
    try {
        const response = await fetch(`${API_BASE}/cross-platform-journalists`);
        const data = await response.json();
        
        const container = document.getElementById('cross-platform-list');
        
        if (data.journalists.length === 0) {
            container.innerHTML = '<p style="color: #666;">No cross-platform journalists found.</p>';
            return;
        }

        container.innerHTML = data.journalists.map(j => `
            <div class="list-item" onclick="showJournalistDetail(${j.id})">
                <span class="item-name">${escapeHtml(j.name)}</span>
                <span class="item-meta">${j.outlet_count} outlet${j.outlet_count !== 1 ? 's' : ''} →</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading cross-platform journalists:', error);
        showError('Failed to load cross-platform journalists');
    }
}

// Load top outlets
async function loadTopOutlets() {
    try {
        const response = await fetch(`${API_BASE}/top-outlets/15`);
        const data = await response.json();
        
        const container = document.getElementById('top-outlets-list');
        
        if (data.outlets.length === 0) {
            container.innerHTML = '<p style="color: #666;">No outlets found.</p>';
            return;
        }

        container.innerHTML = data.outlets.map(o => `
            <div class="list-item" onclick="showOutletDetail(${o.id})">
                <span class="item-name">${escapeHtml(o.name)}</span>
                <span class="item-meta">${o.journalist_count} journalist${o.journalist_count !== 1 ? 's' : ''} →</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading top outlets:', error);
        showError('Failed to load top outlets');
    }
}

// Perform journalist search
async function performJournalistSearch(query) {
    if (!query.trim()) {
        document.getElementById('journalist-search-results').innerHTML = '<p class="loading">Enter a search term...</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/search/journalists/${encodeURIComponent(query)}`);
        const data = await response.json();
        
        const container = document.getElementById('journalist-search-results');
        
        if (data.journalists.length === 0) {
            container.innerHTML = '<p style="color: #666;">No journalists found matching your search.</p>';
            return;
        }

        container.innerHTML = data.journalists.map(j => `
            <div class="list-item" onclick="showJournalistDetail(${j.id})">
                <span class="item-name">${escapeHtml(j.name)}</span>
                <span class="item-meta">${j.outlet_count} outlet${j.outlet_count !== 1 ? 's' : ''}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error searching journalists:', error);
        showError('Failed to search journalists');
    }
}

// Perform outlet search
async function performOutletSearch(query) {
    if (!query.trim()) {
        document.getElementById('outlet-search-results').innerHTML = '<p class="loading">Enter a search term...</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/search/outlets/${encodeURIComponent(query)}`);
        const data = await response.json();
        
        const container = document.getElementById('outlet-search-results');
        
        if (data.outlets.length === 0) {
            container.innerHTML = '<p style="color: #666;">No outlets found matching your search.</p>';
            return;
        }

        container.innerHTML = data.outlets.map(o => `
            <div class="list-item" onclick="showOutletDetail(${o.id})">
                <span class="item-name">${escapeHtml(o.name)}</span>
                <span class="item-meta">${o.journalist_count} journalist${o.journalist_count !== 1 ? 's' : ''}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error searching outlets:', error);
        showError('Failed to search outlets');
    }
}

// Show journalist detail view
async function showJournalistDetail(journalistId) {
    currentView = 'journalist';
    currentEntity = { type: 'journalist', id: journalistId };

    try {
        const response = await fetch(`${API_BASE}/journalists/${journalistId}`);
        const data = await response.json();

        if (data.error) {
            showError(data.error);
            return;
        }

        // Populate profile info
        document.getElementById('j-profile-name').textContent = data.profile.name;
        document.getElementById('j-profile-meta').textContent = `Journalist ID: ${journalistId}`;
        document.getElementById('j-total-outlets').textContent = data.profile.total_outlets;
        
        // Format outlet list as comma-separated string
        const outletsList = Array.isArray(data.profile.outlets_list) 
            ? data.profile.outlets_list.join(', ')
            : data.profile.outlets_list || '';
        document.getElementById('j-outlet-list').textContent = outletsList;

        // Generate navigation links
        const navLinksHtml = data.navigation_links.map(link => `
            <a href="#" class="link-item" onclick="showOutletDetail(${link.outlet_id}); return false;">
                🔗 ${escapeHtml(link.outlet_name)} →
            </a>
        `).join('');

        document.getElementById('j-navigation-links').innerHTML = navLinksHtml;

        // Show detail view, hide outlet detail
        document.getElementById('journalist-detail').style.display = 'block';
        document.getElementById('outlet-detail').style.display = 'none';

    } catch (error) {
        console.error('Error loading journalist detail:', error);
        showError('Failed to load journalist profile');
    }
}

// Show outlet detail view
async function showOutletDetail(outletId) {
    currentView = 'outlet';
    currentEntity = { type: 'outlet', id: outletId };

    try {
        const response = await fetch(`${API_BASE}/outlets/${outletId}`);
        const data = await response.json();

        if (data.error) {
            showError(data.error);
            return;
        }

        // Populate profile info
        document.getElementById('o-profile-name').textContent = data.profile.name;
        document.getElementById('o-profile-meta').textContent = `Media Outlet ID: ${outletId}`;
        document.getElementById('o-total-journalists').textContent = data.profile.total_journalists;
        
        // Format journalist list as comma-separated string
        const journalistsList = Array.isArray(data.profile.journalists_list) 
            ? data.profile.journalists_list.join(', ')
            : data.profile.journalists_list || '';
        document.getElementById('o-journalist-list').textContent = journalistsList;

        // Generate navigation links
        const navLinksHtml = data.navigation_links.map(link => `
            <a href="#" class="link-item" onclick="showJournalistDetail(${link.journalist_id}); return false;">
                🔗 ${escapeHtml(link.journalist_name)} →
            </a>
        `).join('');

        document.getElementById('o-navigation-links').innerHTML = navLinksHtml;

        // Show detail view, hide journalist detail
        document.getElementById('outlet-detail').style.display = 'block';
        document.getElementById('journalist-detail').style.display = 'none';

    } catch (error) {
        console.error('Error loading outlet detail:', error);
        showError('Failed to load outlet profile');
    }
}

// Hide detail view and return to main navigation
function hideDetailView() {
    document.getElementById('journalist-detail').style.display = 'none';
    document.getElementById('outlet-detail').style.display = 'none';
    
    // Reset search inputs
    document.getElementById('journalist-search-input').value = '';
    document.getElementById('outlet-search-input').value = '';
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    alert(message);
}
