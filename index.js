// Estado da aplicação
        let works = JSON.parse(localStorage.getItem('myshelf_works')) || [];
        let currentFilter = 'all';
        let darkMode = localStorage.getItem('myshelf_darkmode') === 'true';
        let editingWorkId = null;
        let exploreType = 'filme';

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            if (darkMode) {
                document.body.classList.add('dark-mode');
                document.querySelector('.dark-mode-toggle').textContent = '☀️';
            }
            loadPopularWorks();
            renderLibrary();
            generateAffinities();
            loadProfile();
            updateStats();
            drawChart();
            setExploreType('filme');
        });

        // Account helper functions
        function getAccounts() {
            try { return JSON.parse(localStorage.getItem('accounts') || '{}'); } catch (e) { return {}; }
        }
        function saveAccounts(accounts) {
            localStorage.setItem('accounts', JSON.stringify(accounts));
        }

        function migrateLegacyAccount() {
            const accounts = getAccounts();
            if (Object.keys(accounts).length === 0) {
                const legacyEmail = localStorage.getItem('emailUsuario');
                const legacyPass = localStorage.getItem('senhaUsuario');
                const legacyName = localStorage.getItem('nomeUsuario');
                const legacyBio = localStorage.getItem('profileBio');
                const legacyAvatar = localStorage.getItem('profileAvatarImage');
                if (legacyEmail && legacyPass) {
                    accounts[legacyEmail] = { name: legacyName || 'Usuário MyShelf', password: legacyPass, bio: legacyBio || '', avatar: legacyAvatar || null };
                    saveAccounts(accounts);
                    // remove legacy password key now that accounts map exists
                    localStorage.removeItem('senhaUsuario');
                }
            }
        }

        // Profile management
        function loadProfile() {
            migrateLegacyAccount();
            const currentEmail = localStorage.getItem('emailUsuario') || '';
            const accounts = getAccounts();
            const account = currentEmail ? accounts[currentEmail] : null;

            const name = account ? account.name : (localStorage.getItem('nomeUsuario') || 'Usuário MyShelf');
            const email = currentEmail || '';
            const bio = account ? (account.bio || 'Amante de boas histórias e grandes aventuras 📖') : (localStorage.getItem('profileBio') || 'Amante de boas histórias e grandes aventuras 📖');
            const avatar = account ? (account.avatar || null) : (localStorage.getItem('profileAvatarImage') || null);

            document.getElementById('profileName').textContent = name;
            document.getElementById('profileEmail').textContent = email;
            document.getElementById('profileBio').textContent = bio;

            const avatarImg = document.getElementById('profileAvatarImg');
            const avatarLetter = document.getElementById('profileAvatarLetter');
            const previewImg = document.getElementById('profileAvatarPreviewImg');
            const previewLetter = document.getElementById('profileAvatarPreviewLetter');

            if (avatar) {
                if (avatarImg) { avatarImg.src = avatar; avatarImg.style.display = 'block'; }
                if (avatarLetter) { avatarLetter.style.display = 'none'; }
                if (previewImg) { previewImg.src = avatar; previewImg.style.display = 'block'; }
                if (previewLetter) { previewLetter.style.display = 'none'; }
            } else {
                if (avatarImg) { avatarImg.src = ''; avatarImg.style.display = 'none'; }
                if (avatarLetter) { avatarLetter.textContent = name.charAt(0).toUpperCase(); avatarLetter.style.display = 'flex'; }
                if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
                if (previewLetter) { previewLetter.textContent = name.charAt(0).toUpperCase(); previewLetter.style.display = 'flex'; }
            }
        }

        function startEditProfile() {
            // prepare temporary state for edits
            window._tempProfileAvatarData = undefined; // undefined => no change yet; null => explicit remove

            document.getElementById('profileEditForm').style.display = 'block';
            document.getElementById('profileView').style.display = 'none';

            // show/hide header action buttons
            document.getElementById('btnProfileEdit').style.display = 'none';
            document.getElementById('btnProfileSave').style.display = 'inline-block';
            document.getElementById('btnProfileCancel').style.display = 'inline-block';
            document.getElementById('profileRemovePhotoBtn').style.display = 'inline-block';

            // populate fields
            document.getElementById('profileNameInput').value = localStorage.getItem('nomeUsuario') || 'Usuário MyShelf';
            document.getElementById('profileEmailInput').value = localStorage.getItem('emailUsuario') || '';
            document.getElementById('profileBioInput').value = localStorage.getItem('profileBio') || '';

            // ensure preview matches stored avatar initially
            const storedAvatar = localStorage.getItem('profileAvatarImage');
            const previewEl = document.getElementById('profileAvatarPreview');
            const previewImg = document.getElementById('profileAvatarPreviewImg');
            const previewLetter = document.getElementById('profileAvatarPreviewLetter');
            const name = document.getElementById('profileNameInput').value;
            if (storedAvatar) { if (previewImg) { previewImg.src = storedAvatar; previewImg.style.display = 'block'; } if (previewLetter) previewLetter.style.display = 'none'; }
            else { if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; } if (previewLetter) { previewLetter.textContent = name.charAt(0).toUpperCase(); previewLetter.style.display = 'flex'; } }

            // clear any previous errors
            hideEmailError();
        }

        function cancelProfileEdit() {
            // discard temp image changes
            window._tempProfileAvatarData = undefined;

            document.getElementById('profileEditForm').style.display = 'none';
            document.getElementById('profileView').style.display = 'block';

            // restore header actions
            document.getElementById('btnProfileEdit').style.display = 'inline-block';
            document.getElementById('btnProfileSave').style.display = 'none';
            document.getElementById('btnProfileCancel').style.display = 'none';
            document.getElementById('profileRemovePhotoBtn').style.display = 'none';

            // revert preview to stored avatar
            loadProfile();
            hideEmailError();
        }

        function saveProfileEdit(e) {
            if (e) e.preventDefault();
            const name = document.getElementById('profileNameInput').value.trim() || 'Usuário MyShelf';
            const email = document.getElementById('profileEmailInput').value.trim() || '';
            const bio = document.getElementById('profileBioInput').value.trim() || '';

            // validar e-mail
            if (email && !isValidEmail(email)) {
                showEmailError('E-mail inválido. Verifique e tente novamente.');
                return;
            }

            const currentEmail = localStorage.getItem('emailUsuario') || '';
            const accounts = getAccounts();

            // If changing to an email that already belongs to another account, block
            if (email !== currentEmail && accounts[email]) {
                showEmailError('Este e-mail já está em uso por outra conta. Escolha outro e-mail.');
                return;
            }

            // Ensure there's an account object for the current user
            if (!accounts[currentEmail]) {
                // Create a minimal account from legacy keys if needed
                accounts[currentEmail] = { name: localStorage.getItem('nomeUsuario') || 'Usuário MyShelf', password: '', bio: localStorage.getItem('profileBio') || '', avatar: localStorage.getItem('profileAvatarImage') || null };
            }

            // Determine resulting avatar value
            let resultingAvatar = accounts[currentEmail].avatar || null;
            if (window._tempProfileAvatarData !== undefined) {
                if (window._tempProfileAvatarData === null) {
                    resultingAvatar = null;
                } else {
                    resultingAvatar = window._tempProfileAvatarData;
                }
            }

            // If email changed, move account; otherwise update in place
            if (email !== currentEmail) {
                const moved = { ...accounts[currentEmail], name: name, bio: bio, avatar: resultingAvatar };
                // ensure password preserved
                moved.password = accounts[currentEmail].password || '';
                // set new key and delete old
                accounts[email] = moved;
                delete accounts[currentEmail];
                // update session key
                localStorage.setItem('emailUsuario', email);
            } else {
                accounts[currentEmail].name = name;
                accounts[currentEmail].bio = bio;
                accounts[currentEmail].avatar = resultingAvatar;
            }

            // persist accounts
            saveAccounts(accounts);

            // update simple storage references used elsewhere in the app
            localStorage.setItem('nomeUsuario', name);
            localStorage.setItem('profileBio', bio);
            if (resultingAvatar) localStorage.setItem('profileAvatarImage', resultingAvatar); else localStorage.removeItem('profileAvatarImage');

            loadProfile();
            cancelProfileEdit();
            alert('Perfil salvo com sucesso!');
        }

        function handleAvatarFileChange(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                const dataUrl = ev.target.result;
                // store temporarily until user saves
                window._tempProfileAvatarData = dataUrl;
                const previewImg = document.getElementById('profileAvatarPreviewImg');
                const previewLetter = document.getElementById('profileAvatarPreviewLetter');
                if (previewImg) { previewImg.src = dataUrl; previewImg.style.display = 'block'; }
                if (previewLetter) previewLetter.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }

        function removeProfileAvatar() {
            // mark to remove on save
            window._tempProfileAvatarData = null;
            const previewImg = document.getElementById('profileAvatarPreviewImg');
            const previewLetter = document.getElementById('profileAvatarPreviewLetter');
            const name = document.getElementById('profileNameInput').value || document.getElementById('profileName').textContent || 'U';
            if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
            if (previewLetter) { previewLetter.textContent = name.charAt(0).toUpperCase(); previewLetter.style.display = 'flex'; }
        }

        function isValidEmail(email) {
            // simples validação
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function showEmailError(msg) {
            const el = document.getElementById('profileEmailError');
            if (el) { el.style.display = 'block'; el.textContent = msg; }
            const input = document.getElementById('profileEmailInput');
            if (input) input.classList.add('error');
        }

        function hideEmailError() {
            const el = document.getElementById('profileEmailError');
            if (el) { el.style.display = 'none'; el.textContent = ''; }
            const input = document.getElementById('profileEmailInput');
            if (input) input.classList.remove('error');
        }

        // Navegação entre páginas
        function navigateTo(page) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById(page + 'Page');
            if (target) target.classList.add('active');

            // destacar link da navbar
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.page === page);
            });

            if (page === 'library') {
                // Biblioteca possui layout próprio (sem sidebar lateral)
                document.querySelector('.main-content').classList.remove('with-sidebar');
                const sidebarEl = document.getElementById('sidebar');
                if (sidebarEl) sidebarEl.classList.remove('active');
                renderLibrary();
            } else {
                document.querySelector('.main-content').classList.remove('with-sidebar');
                const sidebarEl = document.getElementById('sidebar');
                if (sidebarEl) sidebarEl.classList.remove('active');
            }

            if (page === 'stats') {
                updateStats();
                // garantir que o canvas seja desenhado após o repaint
                requestAnimationFrame(() => drawChart());
            }

            if (page === 'affinity') {
                generateAffinities();
                // destacar a aba Afinidades na barra de guias da biblioteca
                document.querySelectorAll('.library-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.filter === 'affinity'));
            } else {
                // se não for afinidade, garantir que a aba 'all' esteja ativa quando estivermos na biblioteca
                if (page === 'library') {
                    document.querySelectorAll('.library-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.filter === 'all'));
                } else {
                    document.querySelectorAll('.library-tab').forEach(tab => tab.classList.remove('active'));
                }
            }

            window.scrollTo(0, 0);
        }


        // Renderizar biblioteca
        function renderLibrary() {
            const container = document.getElementById('libraryCards');

            // atualizar contadores das abas e do cabeçalho
            const total = works.length;
            const likedCount = works.filter(w => w.liked).length;
            const wishlistCount = works.filter(w => w.wishlist).length;

            if (document.getElementById('libraryCount')) document.getElementById('libraryCount').textContent = total;
            if (document.getElementById('tabTotal')) document.getElementById('tabTotal').textContent = total;
            if (document.getElementById('tabLiked')) document.getElementById('tabLiked').textContent = likedCount;
            if (document.getElementById('tabWishlist')) document.getElementById('tabWishlist').textContent = wishlistCount;

            let filteredWorks = works;

            // Aplicar filtros
            const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
            const typeFilter = document.getElementById('typeFilter')?.value || '';
            const genreFilter = document.getElementById('genreFilter')?.value || '';

            filteredWorks = works.filter(work => {
                const matchSearch = work.name.toLowerCase().includes(searchTerm);
                const matchType = !typeFilter || work.type === typeFilter;
                const matchGenre = !genreFilter || work.genre === genreFilter;
                const matchFilter = currentFilter === 'all' || 
                                  (currentFilter === 'liked' && work.liked) ||
                                  (currentFilter === 'wishlist' && work.wishlist);
                return matchSearch && matchType && matchGenre && matchFilter;
            });

            if (filteredWorks.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <h3>Sua biblioteca está vazia.</h3>
                        <p>Adicione sua primeira obra clicando em <strong>➕ Adicionar Obra</strong></p>
                    </div>
                `;
                return;
            }

            container.innerHTML = filteredWorks.map(work => `
                <div class="card">
                    ${work.image ? 
                        `<img src="${work.image}" alt="${work.name}" class="card-image">` :
                        `<div class="card-image"></div>`
                    }
                    <div class="card-content">
                        <h3 class="card-title">${work.name}</h3>
                        <div class="card-meta">
                            <span class="badge">${getTypeIcon(work.type)} ${work.type}</span>
                            <span class="badge">${work.genre}</span>
                        </div>
                        <p class="card-description">${work.description || 'Sem descrição'}</p>
                        <div class="card-actions">
                            <button class="btn-icon btn-like ${work.liked ? 'liked' : ''}" onclick="toggleLike('${work.id}')">
                                ${work.liked ? '❤️' : '🤍'}
                            </button>
                            <button class="btn-icon" onclick="editWork('${work.id}')" title="Editar">✏️</button>
                            <button class="btn-icon" onclick="deleteWork('${work.id}')" title="Remover">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function filterLibrary(filter) {
            currentFilter = filter;
            // atualizar estado das guias da biblioteca
            document.querySelectorAll('.library-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.filter === filter));

            // manter compatibilidade visual com sidebar
            document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
            if (filter === 'wishlist') {
                const wishlistLink = Array.from(document.querySelectorAll('.sidebar-link')).find(l => l.textContent.includes('Desejos'));
                if (wishlistLink) wishlistLink.classList.add('active');
            } else if (filter === 'liked') {
                const likedLink = Array.from(document.querySelectorAll('.sidebar-link')).find(l => l.textContent.includes('Curtidas'));
                if (likedLink) likedLink.classList.add('active');
            } else {
                const defaultLink = Array.from(document.querySelectorAll('.sidebar-link')).find(l => l.textContent.includes('Lista de Desejos'));
                if (defaultLink) defaultLink.classList.add('active');
            }

            renderLibrary();
        }
        // Toggle Sidebar
        function toggleSidebar() {
            const sidebarEl = document.getElementById('sidebar');
            if (sidebarEl) sidebarEl.classList.toggle('active');
        }

        // Toggle Dark Mode
        function toggleDarkMode() {
            darkMode = !darkMode;
            document.body.classList.toggle('dark-mode');
            document.querySelector('.dark-mode-toggle').textContent = darkMode ? '☀️' : '🌙';
            localStorage.setItem('myshelf_darkmode', darkMode);
        }

        // Modal
        function openAddModal() {
            editingWorkId = null;
            document.getElementById('addModal').classList.add('active');
            document.getElementById('addWorkForm').reset();
            document.getElementById('imagePreview').style.display = 'none';
        }

        function closeAddModal() {
            document.getElementById('addModal').classList.remove('active');
            editingWorkId = null;
        }

        function previewImage(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('imagePreview');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }

        // Salvar obra
        function saveWork(event) {
            event.preventDefault();
            
            const work = {
                id: editingWorkId || Date.now().toString(),
                name: document.getElementById('workName').value,
                type: document.getElementById('workType').value,
                genre: document.getElementById('workGenre').value,
                description: document.getElementById('workDescription').value,
                image: document.getElementById('imagePreview').src || null,
                liked: false,
                wishlist: true,
                createdAt: new Date().toISOString()
            };

            if (editingWorkId) {
                const index = works.findIndex(w => w.id === editingWorkId);
                works[index] = { ...works[index], ...work };
            } else {
                works.push(work);
            }

            localStorage.setItem('myshelf_works', JSON.stringify(works));
            closeAddModal();
            renderLibrary();
            updateStats();
            drawChart();
        }

        // Renderizar biblioteca
        function renderLibrary() {
            const container = document.getElementById('libraryCards');
            let filteredWorks = works;

            // Aplicar filtros
            const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
            const typeFilter = document.getElementById('typeFilter')?.value || '';
            const genreFilter = document.getElementById('genreFilter')?.value || '';

            filteredWorks = works.filter(work => {
                const matchSearch = work.name.toLowerCase().includes(searchTerm);
                const matchType = !typeFilter || work.type === typeFilter;
                const matchGenre = !genreFilter || work.genre === genreFilter;
                const matchFilter = currentFilter === 'all' || 
                                  (currentFilter === 'liked' && work.liked) ||
                                  (currentFilter === 'wishlist' && work.wishlist);
                return matchSearch && matchType && matchGenre && matchFilter;
            });

            if (filteredWorks.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <h3>Nenhuma obra encontrada</h3>
                        <p>Adicione novas obras ou ajuste os filtros</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = filteredWorks.map(work => `
                <div class="card">
                    ${work.image ? 
                        `<img src="${work.image}" alt="${work.name}" class="card-image">` :
                        `<div class="card-image"></div>`
                    }
                    <div class="card-content">
                        <h3 class="card-title">${work.name}</h3>
                        <div class="card-meta">
                            <span class="badge">${getTypeIcon(work.type)} ${work.type}</span>
                            <span class="badge">${work.genre}</span>
                        </div>
                        <p class="card-description">${work.description || 'Sem descrição'}</p>
                        <div class="card-actions">
                            <button class="btn-icon btn-like ${work.liked ? 'liked' : ''}" onclick="toggleLike('${work.id}')">
                                ${work.liked ? '❤️' : '🤍'}
                            </button>
                            <button class="btn-icon" onclick="editWork('${work.id}')" title="Editar">✏️</button>
                            <button class="btn-icon" onclick="deleteWork('${work.id}')" title="Remover">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function getTypeIcon(type) {
            const icons = { livro: '📚', filme: '🎬', serie: '📺' };
            return icons[type] || '📄';
        }

        // Toggle Like
        function toggleLike(id) {
            const work = works.find(w => w.id === id);
            if (work) {
                work.liked = !work.liked;
                localStorage.setItem('myshelf_works', JSON.stringify(works));
                renderLibrary();
                updateStats();
                drawChart();
            }
        }

        // Editar obra
        function editWork(id) {
            const work = works.find(w => w.id === id);
            if (work) {
                editingWorkId = id;
                document.getElementById('workName').value = work.name;
                document.getElementById('workType').value = work.type;
                document.getElementById('workGenre').value = work.genre;
                document.getElementById('workDescription').value = work.description || '';
                
                if (work.image) {
                    const preview = document.getElementById('imagePreview');
                    preview.src = work.image;
                    preview.style.display = 'block';
                }
                
                document.getElementById('addModal').classList.add('active');
            }
        }

        // Deletar obra
        function deleteWork(id) {
            if (confirm('Tem certeza que deseja remover esta obra?')) {
                works = works.filter(w => w.id !== id);
                localStorage.setItem('myshelf_works', JSON.stringify(works));
                renderLibrary();
                updateStats();
            }
        }

        // Filtros
        function filterLibrary(filter) {
            currentFilter = filter;
            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.classList.remove('active');
            });
            event.target.classList.add('active');
            renderLibrary();
        }

        function filterWorks() {
            renderLibrary();
        }

        // Carregar obras populares (mock)
        function loadPopularWorks() {
            const popularWorks = [
                { name: 'O Senhor dos Anéis', type: 'livro', genre: 'Fantasia', description: 'Uma épica jornada pela Terra Média' },
                { name: 'Inception', type: 'filme', genre: 'Sci-Fi', description: 'Um thriller sobre sonhos dentro de sonhos' },
                { name: 'Breaking Bad', type: 'serie', genre: 'Drama', description: 'A transformação de um professor em criminoso' },
                { name: '1984', type: 'livro', genre: 'Ficção', description: 'Distopia clássica de George Orwell' },
                { name: 'Interestelar', type: 'filme', genre: 'Sci-Fi', description: 'Uma jornada pelo espaço e tempo' },
                { name: 'Stranger Things', type: 'serie', genre: 'Terror', description: 'Mistérios sobrenaturais nos anos 80' }
            ];

            const container = document.getElementById('popularWorks');
            container.innerHTML = popularWorks.map(work => `
                <div class="card">
                    <div class="card-image"></div>
                    <div class="card-content">
                        <h3 class="card-title">${work.name}</h3>
                        <div class="card-meta">
                            <span class="badge">${getTypeIcon(work.type)} ${work.type}</span>
                            <span class="badge">${work.genre}</span>
                        </div>
                        <p class="card-description">${work.description}</p>
                    </div>
                </div>
            `).join('');
        }

        // Buscar na API externa (OMDb e Google Books)
        function setExploreType(type) {
            exploreType = type;
            document.querySelectorAll('.explore-tab').forEach(tab => tab.classList.remove('active'));
            const tabEl = document.querySelector(`.explore-tab[data-type="${type}"]`);
            if (tabEl) tabEl.classList.add('active');

            const input = document.getElementById('exploreSearch');
            if (input) {
                if (type === 'livro') {
                    input.placeholder = '🔍 Buscar livros...';
                } else if (type === 'serie') {
                    input.placeholder = '🔍 Buscar séries...';
                } else {
                    input.placeholder = '🔍 Buscar filmes...';
                }
                input.value = '';
            }

            document.getElementById('exploreCards').innerHTML = '';
        }

        async function searchExternalAPI() {
            const query = document.getElementById('exploreSearch').value.trim();
            if (!query) return;

            const container = document.getElementById('exploreCards');
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Buscando...</div>';

            try {
                if (exploreType === 'livro') {
                    // Google Books
                    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
                    const data = await response.json();

                    if (data.totalItems && data.items) {
                        container.innerHTML = data.items.map(item => {
                            const info = item.volumeInfo || {};
                            const thumb = info.imageLinks ? (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail) : '';
                            const authors = info.authors ? info.authors.join(', ') : '';
                            const published = info.publishedDate || '';
                            const title = (info.title || 'Sem título').replace(/'/g, "\\'");
                            const image = thumb ? thumb.replace(/^http:/, 'https:') : '';
                            return `
                                <div class="card">
                                    ${image ? `<img src="${image}" class="card-image" onerror="this.style.display='none'">` : `<div class="card-image"></div>`}
                                    <div class="card-content">
                                        <h3 class="card-title">${title}</h3>
                                        <div class="card-meta">
                                            <span class="badge">📚 Livro</span>
                                            <span class="badge">${authors || published}</span>
                                        </div>
                                        <button class="btn btn-primary" onclick="addFromExternal('${title}', '${image}', 'book', '${published || authors}')">
                                            Adicionar à Biblioteca
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('');
                    } else {
                        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">😕</div><h3>Nenhum resultado encontrado</h3></div>';
                    }
                } else {
                    // OMDb for movies and series
                    const typeParam = exploreType === 'serie' ? 'series' : 'movie';
                    const response = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&type=${typeParam}&apikey=1ec3258d`);
                    const data = await response.json();

                    if (data.Response === 'True') {
                        container.innerHTML = data.Search.map(item => `
                            <div class="card">
                                ${item.Poster && item.Poster !== 'N/A' ? `<img src="${item.Poster}" class="card-image" onerror="this.style.display='none'">` : `<div class="card-image"></div>`}
                                <div class="card-content">
                                    <h3 class="card-title">${item.Title}</h3>
                                    <div class="card-meta">
                                        <span class="badge">${getTypeIcon(item.Type === 'movie' ? 'filme' : item.Type)}</span>
                                        <span class="badge">${item.Year}</span>
                                    </div>
                                    <button class="btn btn-primary" onclick="addFromExternal('${item.Title.replace(/'/g, "\\'")}', '${item.Poster}', '${item.Type}', '${item.Year}')">
                                        Adicionar à Biblioteca
                                    </button>
                                </div>
                            </div>
                        `).join('');
                    } else {
                        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">😕</div><h3>Nenhum resultado encontrado</h3></div>';
                    }
                }
            } catch (error) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Erro ao buscar</h3><p>Tente novamente mais tarde</p></div>';
            }
        }

        function addFromExternal(title, poster, type, year) {
            const mappedType = type === 'movie' ? 'filme' : type === 'series' ? 'serie' : type === 'book' ? 'livro' : type;
            const work = {
                id: Date.now().toString(),
                name: title,
                type: mappedType,
                genre: 'diversos',
                description: `${mappedType === 'livro' ? (year || 'Sem info') : 'Ano: ' + (year || 'N/A')}`,
                image: poster && poster !== 'N/A' ? poster : null,
                liked: false,
                wishlist: true,
                createdAt: new Date().toISOString()
            };

            works.push(work);
            localStorage.setItem('myshelf_works', JSON.stringify(works));
            alert('✅ Obra adicionada à sua biblioteca!');
        }

        // Dados de afinidade persistentes na sessão
        let affinityUsers = [
            { name: 'Ana Silva', avatar: 'AS', affinity: 64, desc: 'Apaixonada por fantasia e ficção científica', genres: ['Ação','Aventura','Fantasia'], followed: false },
            { name: 'Carlos Mendes', avatar: 'CM', affinity: 58, desc: 'Cinéfilo e leitor compulsivo de mistérios', genres: ['Mistério','Drama'], followed: false },
            { name: 'Beatriz Costa', avatar: 'BC', affinity: 71, desc: 'Amo romances e histórias que emocionam', genres: ['Romance','Drama'], followed: false },
            { name: 'Diego Oliveira', avatar: 'DO', affinity: 64, desc: 'Fã de ação e aventura em todas as formas!', genres: ['Ação','Aventura','Fantasia'], followed: false },
            { name: 'Elena Santos', avatar: 'ES', affinity: 58, desc: 'Documentários e não-ficção são meu forte', genres: ['Documentário','História','Ciência'], followed: false },
            { name: 'Felipe Rocha', avatar: 'FR', affinity: 55, desc: 'Comédia é essencial! Rir é viver', genres: ['Comédia','Romance','Ação'], followed: false }
        ];

        // Gerar afinidades
        function generateAffinities() {
            // atualizar os indicadores/top-stats
            const usersCount = affinityUsers.length;
            const likedCount = works.filter(w => w.liked).length;
            const totalWorks = works.length;

            if (document.getElementById('affinityUsers')) document.getElementById('affinityUsers').textContent = usersCount;
            if (document.getElementById('affinityLikes')) document.getElementById('affinityLikes').textContent = likedCount;
            if (document.getElementById('affinityTotalWorks')) document.getElementById('affinityTotalWorks').textContent = totalWorks;

            const container = document.getElementById('affinityList');
            if (!container) return;

            container.innerHTML = affinityUsers.map((user, index) => `
                <div class="affinity-card">
                    <div>
                        <div class="avatar">${user.avatar}</div>
                        <div class="affinity-name">${user.name}</div>
                        <div class="affinity-desc">${user.desc}</div>
                    </div>

                    <div>
                        <div class="affinity-percentage">${user.affinity}%</div>
                        <div class="affinity-percentage-label">${getAffinityLabel(user.affinity)}</div>
                        <div class="genre-badges">
                            ${user.genres.map(g => `<div class="genre-badge">${g}</div>`).join('')}
                        </div>
                    </div>

                    <div class="affinity-footer">
                        <button class="btn-outline" onclick="viewUserLibrary(${index})">Ver Biblioteca</button>
                        <button class="btn-follow ${user.followed ? 'following' : ''}" onclick="followUser(${index})">${user.followed ? 'Seguindo' : 'Seguir'}</button>
                    </div>
                </div>
            `).join('');
        }

        function getAffinityLabel(percent) {
            if (percent >= 75) return 'Ótima afinidade';
            if (percent >= 60) return 'Boa afinidade';
            if (percent >= 50) return 'Afinidade moderada';
            return 'Afinidade baixa';
        }

        function viewUserLibrary(index) {
            const user = affinityUsers[index];
            if (!user) return;
            // Navega para biblioteca e mostra alerta simples (pode ser substituído por filtro real)
            navigateTo('library');
            alert(`Abrindo biblioteca de ${user.name} (simulação).`);
        }

        function followUser(index) {
            const user = affinityUsers[index];
            if (!user) return;
            user.followed = !user.followed;
            generateAffinities();
        }

        // Estatísticas
        function updateStats() {
            const books = works.filter(w => w.type === 'livro').length;
            const movies = works.filter(w => w.type === 'filme').length;
            const series = works.filter(w => w.type === 'serie').length;
            const liked = works.filter(w => w.liked).length;
            const wishlist = works.filter(w => w.wishlist).length;

            if (document.getElementById('totalBooks')) document.getElementById('totalBooks').textContent = books;
            if (document.getElementById('totalMovies')) document.getElementById('totalMovies').textContent = movies;
            if (document.getElementById('totalSeries')) document.getElementById('totalSeries').textContent = series;
            if (document.getElementById('totalLiked')) document.getElementById('totalLiked').textContent = liked;
            if (document.getElementById('totalWishlist')) document.getElementById('totalWishlist').textContent = wishlist;

            // resumo
            const total = works.length;
            if (document.getElementById('sumTotal')) document.getElementById('sumTotal').textContent = total;
            if (document.getElementById('sumLikedRate')) document.getElementById('sumLikedRate').textContent = total === 0 ? '0%' : Math.round((liked / total) * 100) + '%';
            if (document.getElementById('sumWishlist')) document.getElementById('sumWishlist').textContent = wishlist;

            if (document.getElementById('distBooks')) document.getElementById('distBooks').textContent = books;
            if (document.getElementById('distMovies')) document.getElementById('distMovies').textContent = movies;
            if (document.getElementById('distSeries')) document.getElementById('distSeries').textContent = series;

            if (document.getElementById('distBooksPct')) document.getElementById('distBooksPct').textContent = total === 0 ? '0%' : Math.round((books / total) * 100) + '%';
            if (document.getElementById('distMoviesPct')) document.getElementById('distMoviesPct').textContent = total === 0 ? '0%' : Math.round((movies / total) * 100) + '%';
            if (document.getElementById('distSeriesPct')) document.getElementById('distSeriesPct').textContent = total === 0 ? '0%' : Math.round((series / total) * 100) + '%';
        }

        function drawChart(retries = 8) {
            const canvas = document.getElementById('genreChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            // usar obras curtidas como preferência; se não houver, usar todas
            let source = works.filter(w => w.liked);
            if (source.length === 0) source = works;

            // normalizar gênero (trim) e contar
            const genres = {};
            source.forEach(work => {
                const g = ((work.genre || 'Outros').toString() || 'Outros').trim();
                genres[g] = (genres[g] || 0) + 1;
            });

            const labels = Object.keys(genres);
            const data = Object.values(genres);
            const total = data.reduce((a, b) => a + b, 0);

            // medir parent com getBoundingClientRect para obter dimensões reais
            const parent = canvas.parentElement;
            const rect = parent ? parent.getBoundingClientRect() : { width: 0, height: 0 };

            const ratio = window.devicePixelRatio || 1;
            let width = Math.max(rect.width, 0);
            let height = Math.max(rect.height, 0);

            // fallback se o container ainda não tiver tamanho (por ex. logo após troca de abas)
            if (width < 10 || height < 10) {
                if (retries > 0) {
                    console.debug('drawChart: container too small, retrying...', { width, height, retries });
                    // aguardar próximo frame e tentar novamente
                    requestAnimationFrame(() => drawChart(retries - 1));
                    return;
                } else {
                    // último recurso: usar tamanho padrão
                    width = 400;
                    height = 300;
                }
            }

            // definir tamanho de exibição e resolução do canvas para HiDPI
            canvas.style.width = Math.floor(width) + 'px';
            canvas.style.height = Math.floor(height) + 'px';
            canvas.width = Math.floor(width * ratio);
            canvas.height = Math.floor(height * ratio);

            // reset transform e escalar para HiDPI
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, width, height);

            if (total === 0) {
                // desenhar vazio
                ctx.fillStyle = '#f3e8ff';
                ctx.beginPath();
                ctx.arc(width / 2, height / 2, Math.min(width, height) / 3, 0, Math.PI * 2);
                ctx.fill();

                const topDiv = document.getElementById('topGenres');
                if (topDiv) topDiv.innerHTML = '<p style="color: var(--text-light);">Nenhum dado para exibir</p>';
                return;
            }

            const colors = ['#9b87f5', '#f5d0fe', '#fbbf24', '#10b981', '#ef4444', '#3b82f6', '#f97316', '#8b5cf6'];

            let startAngle = -0.5 * Math.PI;
            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) / 3;

            for (let i = 0; i < data.length; i++) {
                const value = data[i];
                const slice = (value / total) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
                ctx.closePath();
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
                startAngle += slice;
            }

            // Texto central: porcentagem do maior gênero
            const entries = labels.map((l, i) => ({ label: l, value: data[i], percent: Math.round((data[i] / total) * 100), color: colors[i % colors.length] }));
            entries.sort((a, b) => b.value - a.value);

            ctx.fillStyle = '#222';
            ctx.font = Math.max(14, Math.round(radius * 0.25)) + 'px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(entries[0].percent + '%', cx, cy + Math.round(radius * 0.08));

            // Atualizar Top 5
            const topDiv = document.getElementById('topGenres');
            if (topDiv) {
                topDiv.innerHTML = entries.slice(0, 5).map(e => `
                    <div class="top5-item">
                        <div>
                            <span class="top5-dot" style="background:${e.color}"></span>
                            <span class="top5-label">${e.label}</span>
                        </div>
                        <div style="text-align:right; width:40%;">
                            <div class="top5-meta">${e.value} obras</div>
                            <div class="top5-bar"><div class="top5-bar-fill" style="width:${Math.round((e.value / total) * 100)}%; background:${e.color}"></div></div>
                        </div>
                    </div>
                `).join('');
            }

            console.debug('drawChart: rendered', { width, height, ratio, total, entries });
        }

        // redimensionar: redesenhar gráfico se a aba estatísticas estiver ativa
        window.addEventListener('resize', () => {
            const statsEl = document.getElementById('statsPage');
            if (statsEl && statsEl.classList.contains('active')) drawChart();
        });

        // Perfil
        function editProfile() {
            const name = prompt('Digite seu nome:', 'Usuário MyShelf');
            if (name) {
                document.getElementById('profileName').textContent = name;
                document.getElementById('profileAvatar').textContent = name.charAt(0).toUpperCase();
            }
        }

        function clearAllData() {
            if (confirm('⚠️ Tem certeza? Todos os seus dados serão apagados permanentemente!')) {
                localStorage.removeItem('myshelf_works');
                works = [];
                renderLibrary();
                updateStats();
                alert('✅ Dados limpos com sucesso!');
            }
        }

        // Função de logout
        function fazerLogout() {
            if (confirm('Tem certeza que deseja sair?')) {
                // Limpar dados de sessão/autenticação se existirem
                localStorage.removeItem('emailUsuario');
                localStorage.removeItem('nomeUsuario');
                localStorage.removeItem('senhaUsuario');
                
                // Redirecionar para login
                window.location.href = 'login.html';
            }
        }

        // Fechar modal ao clicar fora
        document.getElementById('addModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeAddModal();
            }
        });