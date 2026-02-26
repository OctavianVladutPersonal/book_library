/**
 * Book Library Functions
 * Handles book CRUD operations and table rendering
 */

// Track the ID of the newly added book for highlighting
let newlyAddedBookId = null;

function renderTable(booksToRender) {
    const isLoggedIn = !!auth.currentUser;
    DOM.actionsHeader.style.display = 'table-cell';

    DOM.bookListBody.innerHTML = '';
    booksToRender.forEach(book => {
        const row = document.createElement('tr');
        
        // Add highlight class if this is the newly added book
        if (newlyAddedBookId && book.id === newlyAddedBookId) {
            row.classList.add('newly-added');
        }

        const actionButtonsHtml = isLoggedIn
            ? `<td class="action-cell">
                <button onclick="openEditModal('${book.id}', '${Utils.encodeForAttribute(book.title)}', '${Utils.encodeForAttribute(book.author)}')" class="icon-button edit-icon" title="Edit">✏️</button>
                <button onclick="deleteBook('${book.id}')" class="icon-button delete-icon" title="Delete">🗑️</button>
            </td>`
            : `<td class="action-cell">
                <button class="icon-button edit-icon" disabled title="Log in to edit">✏️</button>
                <button class="icon-button delete-icon" disabled title="Log in to delete">🗑️</button>
            </td>`;

        row.innerHTML = `
            <td>${book.title}</td>
            <td>${book.author}</td>
            ${actionButtonsHtml}
        `;
        DOM.bookListBody.appendChild(row);
    });

    // Remove highlight after animation completes (3 seconds)
    if (newlyAddedBookId) {
        setTimeout(() => {
            const highlightedRows = document.querySelectorAll('tr.newly-added');
            highlightedRows.forEach(row => row.classList.remove('newly-added'));
            newlyAddedBookId = null;
        }, 3000);
    }
}

function clearAllFlows() {
    // Clear form inputs
    document.getElementById('bookName').value = '';
    document.getElementById('authorName').value = '';
    document.getElementById('manual-isbn-input').value = '';
    
    // Clear status messages
    DOM.manualStatus.textContent = '';
    DOM.photoStatus.textContent = '';
    DOM.scannerStatus.textContent = '';
    
    // Close scanner modal
    closeISBNScanner();
    
    // Reset edit form if visible
    if (!DOM.editBookSection.classList.contains('hidden')) {
        cancelEdit();
    }
}

function showNewlyAddedBook(title, author) {
    // Find the newly added book in the library
    const addedBook = AppState.library.find(book =>
        book.title.toLowerCase() === title.toLowerCase() &&
        book.author.toLowerCase() === author.toLowerCase()
    );
    
    if (addedBook) {
        newlyAddedBookId = addedBook.id;
    }
    
    // Clear search to show all books
    DOM.searchInput.value = '';
    
    // Calculate which page the new book is on
    const bookIndex = AppState.library.findIndex(book => book.id === newlyAddedBookId);
    if (bookIndex !== -1) {
        AppState.currentPage = Math.floor(bookIndex / AppState.itemsPerPage) + 1;
    }
    
    updateView();
    
    // Scroll to and highlight the newly added book after alert is dismissed
    // Use setTimeout to allow time for the alert to be dismissed first
    setTimeout(() => {
        const highlightedRow = document.querySelector('tr.newly-added');
        if (highlightedRow) {
            highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function addBook(event) {
    event.preventDefault();
    const title = document.getElementById('bookName').value.trim();
    const author = document.getElementById('authorName').value.trim();

    if (title && author) {
        if (Utils.bookExists(title, author, AppState.library)) {
            alert(`"${title}" by ${author} is already in your library.`);
            return;
        }

        db.collection("books").add({
            title: title,
            author: author
        })
            .then(() => {
                showNewlyAddedBook(title, author);
                clearAllFlows();
            })
            .catch((error) => {
                console.error("Error adding book: ", error);
                if (error.code === "permission-denied") {
                    alert("Error: Permission denied. Are you logged in?");
                } else {
                    alert("Error adding book. Check console.");
                }
            });
    }
}

window.deleteBook = function (docId) {
    if (!auth.currentUser) {
        alert("You must be logged in to delete books.");
        return;
    }

    if (confirm("Are you sure you want to delete this book?")) {
        db.collection("books").doc(docId).delete()
            .then(() => {
                console.log("Book successfully deleted!");
            })
            .catch((error) => {
                console.error("Error removing book: ", error);
                alert("Error deleting book: Permission denied or other issue.");
            });
    }
};

window.openEditModal = function (id, title, author) {
    DOM.editBookIdInput.value = id;
    DOM.editBookNameInput.value = Utils.decodeFromAttribute(title);
    DOM.editAuthorNameInput.value = Utils.decodeFromAttribute(author);
    DOM.editBookSection.classList.remove('hidden');
    DOM.addBookSection.classList.add('hidden');
    DOM.editBookNameInput.focus();
};

function updateBook(event) {
    event.preventDefault();

    if (!auth.currentUser) {
        alert("You must be logged in to edit books.");
        return;
    }

    const docId = DOM.editBookIdInput.value;
    const newTitle = DOM.editBookNameInput.value.trim();
    const newAuthor = DOM.editAuthorNameInput.value.trim();

    if (newTitle && newAuthor) {
        db.collection("books").doc(docId).update({
            title: newTitle,
            author: newAuthor
        })
            .then(() => {
                console.log("Book successfully updated!");
                cancelEdit();
            })
            .catch((error) => {
                console.error("Error updating book: ", error);
                alert("Error updating book: Permission denied or other issue.");
            });
    }
}

function cancelEdit() {
    DOM.editBookForm.reset();
    DOM.editBookSection.classList.add('hidden');
    DOM.addBookSection.classList.remove('hidden');
}

function sortLibrary(column) {
    if (!column) return;

    if (AppState.currentSortColumn === column) {
        AppState.isAscending = !AppState.isAscending;
    } else {
        AppState.currentSortColumn = column;
        AppState.isAscending = true;
    }

    AppState.library.sort((a, b) => {
        const valA = a[AppState.currentSortColumn].toLowerCase();
        const valB = b[AppState.currentSortColumn].toLowerCase();
        if (valA < valB) return AppState.isAscending ? -1 : 1;
        if (valA > valB) return AppState.isAscending ? 1 : -1;
        return 0;
    });

    // Reset to first page when sorting
    AppState.currentPage = 1;
    updateHeaderSortClasses();
    updateView();
}

function updateView() {
    const searchTerm = DOM.searchInput.value.toLowerCase();
    const filteredBooks = AppState.library.filter(book => {
        return book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm);
    });
    
    // Calculate pagination
    const totalItems = filteredBooks.length;
    const totalPages = Math.ceil(totalItems / AppState.itemsPerPage);
    
    // Ensure current page is valid
    if (AppState.currentPage > totalPages && totalPages > 0) {
        AppState.currentPage = totalPages;
    }
    if (AppState.currentPage < 1) {
        AppState.currentPage = 1;
    }
    
    // Get books for current page
    const startIndex = (AppState.currentPage - 1) * AppState.itemsPerPage;
    const endIndex = startIndex + AppState.itemsPerPage;
    const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
    
    renderTable(paginatedBooks);
    renderPagination(totalItems, totalPages, filteredBooks);
}

function updateHeaderSortClasses() {
    DOM.tableHeaders.forEach(th => {
        if (th.dataset.column === AppState.currentSortColumn) {
            th.classList.add(AppState.isAscending ? 'sorted-asc' : 'sorted-desc');
            th.classList.remove(AppState.isAscending ? 'sorted-desc' : 'sorted-asc');
        } else {
            th.classList.remove('sorted-asc', 'sorted-desc');
        }
    });
}

function renderPagination(totalItems, totalPages, allBooks) {
    const paginationContainer = document.getElementById('pagination-container');
    const paginationInfo = document.getElementById('pagination-info-text');
    const pageNumbers = document.getElementById('page-numbers');
    const firstButton = document.getElementById('first-page-button');
    const prevButton = document.getElementById('prev-page-button');
    const nextButton = document.getElementById('next-page-button');
    const lastButton = document.getElementById('last-page-button');
    
    // Hide pagination if no items or all items fit on one page
    if (totalItems === 0 || totalPages <= 1) {
        paginationContainer.classList.add('hidden');
        return;
    }
    
    paginationContainer.classList.remove('hidden');
    
    // Update info text
    const startItem = (AppState.currentPage - 1) * AppState.itemsPerPage + 1;
    const endItem = Math.min(startItem + AppState.itemsPerPage - 1, totalItems);
    paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} books`;
    
    // Update button states
    firstButton.disabled = AppState.currentPage === 1;
    prevButton.disabled = AppState.currentPage === 1;
    nextButton.disabled = AppState.currentPage === totalPages;
    lastButton.disabled = AppState.currentPage === totalPages;
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    const maxPageButtons = 5;
    let startPage = Math.max(1, AppState.currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxPageButtons - 1) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    // Add ellipsis at start if needed
    if (startPage > 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.className = 'pagination-ellipsis';
        pageNumbers.appendChild(ellipsis);
    }
    
    // Add page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'pagination-button page-number';
        if (i === AppState.currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => goToPage(i));
        pageNumbers.appendChild(pageButton);
    }
    
    // Add ellipsis at end if needed
    if (endPage < totalPages) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.className = 'pagination-ellipsis';
        pageNumbers.appendChild(ellipsis);
    }
}

function goToPage(page) {
    AppState.currentPage = page;
    updateView();
}

function goToFirstPage() {
    goToPage(1);
}

function goToPreviousPage() {
    if (AppState.currentPage > 1) {
        goToPage(AppState.currentPage - 1);
    }
}

function goToNextPage() {
    const searchTerm = DOM.searchInput.value.toLowerCase();
    const filteredBooks = AppState.library.filter(book => {
        return book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm);
    });
    const totalPages = Math.ceil(filteredBooks.length / AppState.itemsPerPage);
    
    if (AppState.currentPage < totalPages) {
        goToPage(AppState.currentPage + 1);
    }
}

function goToLastPage() {
    const searchTerm = DOM.searchInput.value.toLowerCase();
    const filteredBooks = AppState.library.filter(book => {
        return book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm);
    });
    const totalPages = Math.ceil(filteredBooks.length / AppState.itemsPerPage);
    goToPage(totalPages);
}

function loadBooks() {
    db.collection("books").onSnapshot((snapshot) => {
        AppState.library = [];
        snapshot.forEach((doc) => {
            AppState.library.push({ ...doc.data(), id: doc.id });
        });

        // Apply initial sort (ascending by title)
        AppState.library.sort((a, b) => {
            const valA = a[AppState.currentSortColumn].toLowerCase();
            const valB = b[AppState.currentSortColumn].toLowerCase();
            if (valA < valB) return AppState.isAscending ? -1 : 1;
            if (valA > valB) return AppState.isAscending ? 1 : -1;
            return 0;
        });
        
        updateHeaderSortClasses();
        updateView();
    }, (error) => {
        console.error("Error fetching books: ", error);
    });
}
