        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });

        const TOTAL_SLOTS = 42; // Fixed total slots
        let selectedSlots = [];
        let selectedColor = "#3498db";
        let colorGroupCounter = 1;
        const courses = [];
        const tentativeSlots = {};
        const colorPalette = [
            "#D8D8F6", "#2ecc71", "#f39c12", "#e74c3c", "#1abc9c", "#9b59b6",
            "#34495e", "#16a085", "#27ae60", "#2980b9", "#8e44ad", "#2c3e50"
        ];
        
        let downloadDropdownActive = false;
        
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.color-option').forEach(option => {
                option.addEventListener('click', function() {
                    if (this.classList.contains('disabled')) return;
                    
                    document.querySelectorAll('.color-option').forEach(opt => {
                        opt.classList.remove('active');
                    });
                    this.classList.add('active');
                    selectedColor = this.dataset.color;
                    document.getElementById('customColorInput').value = "";
                    document.getElementById('customColorPreview').style.backgroundColor = selectedColor;
                });
            });
            
            document.getElementById('customColorInput').addEventListener('input', function() {
                let color = this.value.trim();
                if (color.startsWith('#')) {
                    color = color.substring(0, 7);
                } else {
                    color = '#' + color;
                }
                
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    if (color.toLowerCase() !== "#000000" && color.toLowerCase() !== "#ffffff") {
                        selectedColor = color;
                        document.getElementById('customColorPreview').style.backgroundColor = color;
                        document.querySelectorAll('.color-option').forEach(opt => {
                            opt.classList.remove('active');
                        });
                    }
                }
            });
            
            document.querySelectorAll('.selectable').forEach(slot => {
                slot.addEventListener('click', function(e) {
                    if (this.classList.contains('occupied') || this.classList.contains('tentative')) return;
                    
                    toggleSlotSelection(this);
                });
            });
            
            const rainbowPicker = document.getElementById('rainbowPicker');
            const rainbowSelector = document.getElementById('rainbowSelector');
            
            rainbowPicker.addEventListener('click', function(e) {
                const rect = rainbowPicker.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                
                const hue = Math.floor(percent * 360);
                selectedColor = hslToHex(hue, 100, 50);
                
                document.getElementById('customColorPreview').style.backgroundColor = selectedColor;
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                
                rainbowSelector.style.left = `${x - 10}px`;
                rainbowSelector.style.top = '10px';
            });
            
            document.addEventListener('click', function(e) {
                const downloadDropdown = document.getElementById('downloadDropdown');
                if (!downloadDropdown.contains(e.target) && downloadDropdownActive) {
                    toggleDownloadDropdown();
                }
            });
            
            updateStats();
            
            setTimeout(initializeSampleCourses, 500);
        });
        
        function toggleDownloadDropdown() {
            const dropdown = document.getElementById('downloadDropdown');
            downloadDropdownActive = !downloadDropdownActive;
            
            if (downloadDropdownActive) {
                dropdown.classList.add('active');
            } else {
                dropdown.classList.remove('active');
            }
        }
        
        function hslToHex(h, s, l) {
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100;
            const f = n => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        }
        
        function toggleSlotSelection(slotElement) {
            const slot = slotElement.dataset.slot;
            
            if (slotElement.classList.contains('selected')) {
                slotElement.classList.remove('selected');
                slotElement.querySelector('.selection-counter')?.remove();
                
                const index = selectedSlots.indexOf(slot);
                if (index !== -1) {
                    selectedSlots.splice(index, 1);
                }
            } 
            else {
                slotElement.classList.add('selected');
                
                const counter = document.createElement('div');
                counter.className = 'selection-counter';
                counter.textContent = selectedSlots.length + 1;
                slotElement.appendChild(counter);
                
                selectedSlots.push(slot);
            }
            
            document.getElementById('selectedCountText').textContent = selectedSlots.length;
            document.getElementById('selectedCount').textContent = selectedSlots.length;
        }
        
        function saveSelection() {
            if (selectedSlots.length === 0) {
                showSlotError("Please select at least one slot to save");
                return;
            }
            
            const occupied = [];
            selectedSlots.forEach(slot => {
                const element = document.querySelector(`td[data-slot="${slot}"]`);
                if (element && (element.classList.contains('occupied') || element.classList.contains('tentative'))) {
                    occupied.push(slot);
                }
            });
            
            if (occupied.length > 0) {
                showSlotError(`Slot(s) ${occupied.join(", ")} are already occupied`);
                return;
            }
            
            selectedColor = getNextAvailableColor();
            
            openCourseModal();
        }
        
        function markAsTentative() {
            if (selectedSlots.length === 0) {
                showSlotError("Please select at least one slot to mark as tentative");
                return;
            }
            
            const occupied = [];
            selectedSlots.forEach(slot => {
                const element = document.querySelector(`td[data-slot="${slot}"]`);
                if (element && (element.classList.contains('occupied') || element.classList.contains('tentative'))) {
                    occupied.push(slot);
                }
            });
            
            if (occupied.length > 0) {
                showSlotError(`Slot(s) ${occupied.join(", ")} are already occupied`);
                return;
            }
            
            const color = getNextAvailableColor();
            
            selectedSlots.forEach(slot => {
                markSingleTentativeSlot(slot, color, colorGroupCounter);
            });
            
            colorGroupCounter++;
            
            updateStats();
            updateTentativeList();
            
            clearSelection();
        }
        
       function markSingleTentativeSlot(slot, color, groupId) {
    const slotElement = document.querySelector(`td[data-slot="${slot}"]`);
    if (slotElement) {
        slotElement.style.setProperty('--tentative-color', color);
        slotElement.classList.add('tentative');
        slotElement.classList.remove('selected', 'highlighted');
        
        slotElement.classList.remove('selectable');
        
        slotElement.querySelector('.selection-counter')?.remove();
        
        const badge = document.createElement('div');
        badge.className = 'tentative-badge';
        badge.innerHTML = '<i class="fas fa-question"></i>';
        badge.title = 'Tentative slot';
        slotElement.appendChild(badge);
        
        const groupIndicator = document.createElement('div');
        groupIndicator.className = 'color-group-indicator';
        groupIndicator.textContent = groupId;
        slotElement.appendChild(groupIndicator);
        
        tentativeSlots[slot] = {
            color: color,
            element: slotElement,
            groupId: groupId,
            name: "",
            code: "",
            teacher: ""
        };
    }
}
        
        function clearAllTentative() {
            if (Object.keys(tentativeSlots).length === 0) {
                showSlotError("No tentative slots to clear");
                return;
            }
            
            for (const slot in tentativeSlots) {
                const element = tentativeSlots[slot].element;
                element.classList.remove('tentative');
                element.innerHTML = `<span class="slot-code">${slot}</span>`;
                element.querySelector('.tentative-badge')?.remove();
                element.querySelector('.color-group-indicator')?.remove();
            }
            
            for (const slot in tentativeSlots) {
                delete tentativeSlots[slot];
            }
            
            updateStats();
            updateTentativeList();
        }
        
        function removeTentativeSlot(slot) {
            if (tentativeSlots[slot]) {
                const element = tentativeSlots[slot].element;
                element.classList.remove('tentative');
                element.innerHTML = `<span class="slot-code">${slot}</span>`;
                element.querySelector('.tentative-badge')?.remove();
                element.querySelector('.color-group-indicator')?.remove();
                
                delete tentativeSlots[slot];
                
                updateStats();
                updateTentativeList();
            }
        }
        
        function updateTentativeList() {
            const container = document.getElementById('tentativeList');
            container.innerHTML = '';
            
            const slots = Object.keys(tentativeSlots);
            
            if (slots.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-times"></i>
                        <h3>No Tentative Slots</h3>
                        <p>Mark slots as tentative to reserve them for planning</p>
                    </div>
                `;
                return;
            }
            
            const groups = {};
            slots.forEach(slot => {
                const groupId = tentativeSlots[slot].groupId;
                if (!groups[groupId]) {
                    groups[groupId] = [];
                }
                groups[groupId].push(slot);
            });
            
            for (const groupId in groups) {
                const groupSlots = groups[groupId];
                const groupDiv = document.createElement('div');
                groupDiv.className = 'tentative-group';
                
                const groupHeader = document.createElement('div');
                groupHeader.className = 'tentative-group-header';
                
                const firstSlot = groupSlots[0];
                const groupColor = tentativeSlots[firstSlot].color;
                
                groupHeader.innerHTML = `
                    <div class="tentative-color" style="background: ${groupColor}; width: 30px; height: 30px; border-radius: 6px;"></div>
                    <h3 style="margin-left: 10px; color: var(--accent-color);">Tentative Group ${groupId}</h3>
                    <button class="btn btn-tentative" style="margin-left: auto;" onclick="convertTentativeGroup(${groupId})">
                        <i class="fas fa-exchange-alt"></i> Convert to Course
                    </button>
                    <button class="btn btn-danger" style="margin-left: 10px;" onclick="removeTentativeGroup(${groupId})">
                        <i class="fas fa-trash-alt"></i> Remove Group
                    </button>
                `;
                
                groupDiv.appendChild(groupHeader);
                
                groupSlots.forEach(slot => {
                    const slotInfo = tentativeSlots[slot];
                    const item = document.createElement('div');
                    item.className = 'tentative-slot-item';
                    item.style.borderLeftColor = slotInfo.color;
                    
                    item.innerHTML = `
                        <div class="tentative-info">
                            <div style="font-weight: bold; min-width: 40px;">${slot}</div>
                            <div>
                                <div class="slot-subject">Tentative Slot</div>
                                <div class="slot-details">Group ${slotInfo.groupId}</div>
                            </div>
                        </div>
                        <div class="tentative-actions">
                            <button class="btn btn-tentative" onclick="convertSingleTentative('${slot}')">
                                <i class="fas fa-exchange-alt"></i> Convert
                            </button>
                            <button class="btn btn-danger" onclick="removeTentativeSlot('${slot}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `;
                    
                    groupDiv.appendChild(item);
                });
                
                container.appendChild(groupDiv);
            }
        }
        
        function convertTentativeGroup(groupId) {
            const slots = Object.keys(tentativeSlots).filter(slot => 
                tentativeSlots[slot].groupId == groupId
            );
            
            selectedSlots = [...slots];
            
            const firstSlot = slots[0];
            selectedColor = tentativeSlots[firstSlot].color;
            
            openCourseModal();
        }
        
        function convertSingleTentative(slot) {
            selectedSlots = [slot];
            selectedColor = tentativeSlots[slot].color;
            openCourseModal();
        }
        
        // Remove entire tentative group
        function removeTentativeGroup(groupId) {
            const slots = Object.keys(tentativeSlots).filter(slot => 
                tentativeSlots[slot].groupId == groupId
            );
            
            slots.forEach(slot => {
                removeTentativeSlot(slot);
            });
        }
        
        // Open course modal
        function openCourseModal() {
            if (selectedSlots.length === 0) return;
            
            document.getElementById('selectedCountText').textContent = selectedSlots.length;
            document.getElementById('currentSlot').textContent = selectedSlots.join(", ");
            document.getElementById('modalTitle').textContent = "Add Course Details";
            document.getElementById('saveCourseBtn').style.display = "flex";
            
            // Set color preview
            document.getElementById('customColorPreview').style.backgroundColor = selectedColor;
            
            // Position selector on rainbow picker
            updateRainbowSelectorPosition();
            
            // Update the color palette
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('active');
                if (option.dataset.color === selectedColor) {
                    option.classList.add('active');
                }
            });
            
            // Clear custom color input
            document.getElementById('customColorInput').value = "";
            
            // Clear form
            document.getElementById('courseName').value = "";
            document.getElementById('courseCode').value = "";
            document.getElementById('teacherName').value = "";
            
            // Show modal
            document.getElementById('courseModal').style.display = 'flex';
        }
        
        // Update rainbow selector position based on current color
        function updateRainbowSelectorPosition() {
            const hue = hexToHue(selectedColor);
            const rainbowPicker = document.getElementById('rainbowPicker');
            const rect = rainbowPicker.getBoundingClientRect();
            const position = (hue / 360) * rect.width;
            
            document.getElementById('rainbowSelector').style.left = `${position - 10}px`;
        }
        
        function hexToHue(hex) {
            // Convert hex to RGB
            let r = parseInt(hex.substr(1,2), 16) / 255;
            let g = parseInt(hex.substr(3,2), 16) / 255;
            let b = parseInt(hex.substr(5,2), 16) / 255;
            
            // Find max and min
            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let h;
            
            if (max === min) {
                h = 0; // achromatic
            } else {
                let d = max - min;
                switch(max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            
            return Math.round(h * 360);
        }
        
    function generateRandomColor(usedColors) {
        let newColor;
        do {
            newColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        } while (newColor === "#000000" || 
                 newColor === "#ffffff" || 
                 usedColors.includes(newColor));
        return newColor;
    }

    // Get next available color from palette or generate new
    function getNextAvailableColor() {
        const usedColors = courses.map(course => course.color);
        
        // Check tentative slots too
        for (const slot in tentativeSlots) {
            usedColors.push(tentativeSlots[slot].color);
        }
        
        // First try the palette
        for (let color of colorPalette) {
            if (!usedColors.includes(color)) {
                return color;
            }
        }
        
        // If all palette colors are used, generate a random color
        return generateRandomColor(usedColors);
    }
        
        // Show error message
        function showError(...messages) {
            const errorContainer = document.getElementById('errorContainer');
            const errorList = document.getElementById('errorList');
            
            errorList.innerHTML = '';
            messages.forEach(msg => {
                const li = document.createElement('li');
                li.innerHTML = msg;
                li.style.color = "#ff6b6b";
                errorList.appendChild(li);
            });
            
            errorContainer.style.display = 'block';
        }
        
        function showSlotError(message) {
            const errorMessage = document.getElementById("slotErrorMessage");
            errorMessage.textContent = message;
            errorMessage.style.display = "block";
            
            // Hide after 5 seconds
            setTimeout(() => {
                errorMessage.style.display = "none";
            }, 5000);
        }
        
        function hideError() {
            document.getElementById('errorContainer').style.display = 'none';
        }
        
        function saveCourse() {
            const courseName = document.getElementById('courseName').value.trim();
            const courseCode = document.getElementById('courseCode').value.trim();
            const teacherName = document.getElementById('teacherName').value.trim();
            
            // Check if any slot is still available
            const occupiedSlots = [];
            selectedSlots.forEach(slot => {
                const element = document.querySelector(`td[data-slot="${slot}"]`);
                if (element && (element.classList.contains('occupied') || element.classList.contains('tentative'))) {
                    occupiedSlots.push(slot);
                }
            });
            
            if (occupiedSlots.length > 0) {
                showError(
                    `Slot(s) ${occupiedSlots.join(", ")} are now occupied by another course`,
                    `Please try different slots`
                );
                return;
            }
            
            const course = {
                name: courseName || "Unnamed Course",
                code: courseCode || "",
                teacher: teacherName || "",
                slots: [...selectedSlots],
                color: selectedColor
            };
            
            // Add to courses
            courses.push(course);
            
            selectedSlots.forEach(slot => {
                const slotElement = document.querySelector(`td[data-slot="${slot}"]`);
                if (slotElement) {
                    // Remove tentative marking if it exists
                    if (tentativeSlots[slot]) {
                        slotElement.classList.remove('tentative');
                        slotElement.querySelector('.tentative-badge')?.remove();
                        slotElement.querySelector('.color-group-indicator')?.remove();
                        delete tentativeSlots[slot];
                    }
                    
                    slotElement.innerHTML = `<span class="slot-code">${slot} (${course.name})</span>`;
                    slotElement.style.backgroundColor = selectedColor;
                    
                    const hexColor = selectedColor.replace('#', '');
                    if (hexColor.length === 6) {
                        const r = parseInt(hexColor.substr(0,2), 16);
                        const g = parseInt(hexColor.substr(2,2), 16);
                        const b = parseInt(hexColor.substr(4,2), 16);
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        slotElement.style.color = brightness > 128 ? "#000000" : "#ffffff";
                    } else {
                        slotElement.style.color = "#ffffff";
                    }
                    
                    slotElement.classList.add('occupied');
                    slotElement.classList.remove('selectable', 'selected', 'highlighted');
                    slotElement.querySelector('.selection-counter')?.remove();
                }
            });
            
            addCourseToList(course);
            
            // Close modal and reset form
            closeCourseModal();
            updateStats();
            updateTentativeList();
            selectedSlots = [];
            document.getElementById('selectedCount').textContent = '0';
        }
        
        function saveAsTentative() {
            // Assign a color to this group of tentative slots
            const color = selectedColor;
            
            selectedSlots.forEach(slot => {
                markSingleTentativeSlot(slot, color, colorGroupCounter);
            });
            
            colorGroupCounter++;
            
            // Update stats
            updateStats();
            updateTentativeList();
            
            clearSelection();
            
            closeCourseModal();
        }
        
        // Add course to the list
        function addCourseToList(course) {
            const listItem = document.createElement("li");
            listItem.className = "slot-item";
            listItem.style.borderLeftColor = course.color;
            
            let details = "";
            if (course.code || course.teacher) {
                details = `<div class="slot-details">`;
                if (course.code) details += `Code: ${course.code} `;
                if (course.teacher) details += `Teacher: ${course.teacher}`;
                details += `</div>`;
            }
            
            listItem.innerHTML = `
                <div class="slot-info">
                    <div class="slot-codes">Slots: ${course.slots.join(" + ")}</div>
                    <div class="slot-subject">${course.name}</div>
                    ${details}
                </div>
                <div>
                    <div class="color-preview" style="background: ${course.color}"></div>
                    <button class="remove-btn" onclick="removeCourse('${course.slots.join(',')}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            document.getElementById("coursesList").appendChild(listItem);
        }
        
        function removeCourse(slotString) {
            const slots = slotString.split(",");
            const index = courses.findIndex(course => 
                course.slots.join(',') === slotString
            );
            
            if (index !== -1) {
                slots.forEach(slot => {
                    const slotElement = document.querySelector(`td[data-slot="${slot}"]`);
                    if (slotElement) {
                        slotElement.innerHTML = `<span class="slot-code">${slot}</span>`;
                        slotElement.style.backgroundColor = "";
                        slotElement.style.color = "";
                        slotElement.classList.remove('occupied');
                        slotElement.classList.add('selectable');
                    }
                });
                
                // Remove from courses array
                courses.splice(index, 1);
                
                const listItems = document.querySelectorAll('#coursesList li');
                listItems[index].remove();
                
                // Update stats and color options
                updateStats();
            }
        }
        
        function clearSelection() {
            document.querySelectorAll('.selectable.selected').forEach(slot => {
                slot.classList.remove('selected');
                slot.querySelector('.selection-counter')?.remove();
            });
            
            selectedSlots = [];
            document.getElementById('selectedCount').textContent = '0';
        }
        
        function closeCourseModal() {
            document.getElementById('courseModal').style.display = 'none';
            document.getElementById('courseName').value = "";
            document.getElementById('courseCode').value = "";
            document.getElementById('teacherName').value = "";
            hideError();
        }
        
        // Update statistics
        function updateStats() {
            const occupiedSlots = courses.reduce((total, course) => total + course.slots.length, 0);
            
            const tentativeCount = Object.keys(tentativeSlots).length;
            
            document.getElementById('totalSlots').textContent = TOTAL_SLOTS;
            document.getElementById('occupiedSlots').textContent = occupiedSlots;
            document.getElementById('coursesCount').textContent = courses.length;
            document.getElementById('tentativeCount').textContent = tentativeCount;
            document.getElementById('selectedCount').textContent = selectedSlots.length;
        }
        
        function initializeSampleCourses() {
            if (courses.length === 0) {
                const sampleCourses = [
                    {
                        name: "Mathematics",
                        code: "MAT101",
                        teacher: "Dr. Sharma",
                        slots: ["A11", "B11"],
                        color: "#D8D8F6"
                    },
                    {
                        name: "Physics",
                        code: "PHY201",
                        teacher: "Prof. Gupta",
                        slots: ["C11"],
                        color: "#2ecc71"
                    },
                    {
                        name: "Computer Science",
                        code: "CSE301",
                        teacher: "Dr. Patel",
                        slots: ["D11"],
                        color: "#e74c3c"
                    }
                ];
                
                sampleCourses.forEach(course => {
                    courses.push(course);
                    course.slots.forEach(slot => {
                        const slotElement = document.querySelector(`td[data-slot="${slot}"]`);
                        if (slotElement) {
                            slotElement.innerHTML = `<span class="slot-code">${slot} (${course.name})</span>`;
                            slotElement.style.backgroundColor = course.color;
                            
                            // Set text color based on background brightness
                            const hexColor = course.color.replace('#', '');
                            const r = parseInt(hexColor.substr(0,2), 16);
                            const g = parseInt(hexColor.substr(2,2), 16);
                            const b = parseInt(hexColor.substr(4,2), 16);
                            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                            slotElement.style.color = brightness > 128 ? "#000000" : "#ffffff";
                            
                            slotElement.classList.add('occupied');
                            slotElement.classList.remove('selectable');
                        }
                    });
                    addCourseToList(course);
                });
                
                markSingleTentativeSlot("A21", "#f39c12", 1);
                markSingleTentativeSlot("B21", "#f39c12", 1);
                markSingleTentativeSlot("C21", "#9b59b6", 2);
                
                updateStats();
                updateTentativeList();
            }
        }
        
        function highlightSlots() {
            const searchValue = document.getElementById("searchBox").value.toUpperCase().trim();
            const slots = searchValue.split("+");
            const errorMessage = document.getElementById("slotErrorMessage");
            
            document.querySelectorAll(".selectable").forEach(cell => {
                cell.classList.remove('highlighted');
                if (!cell.classList.contains('occupied') && !cell.classList.contains('tentative')) {
                    cell.classList.remove('selected');
                    cell.querySelector('.selection-counter')?.remove();
                }
            });
            
            errorMessage.textContent = "";
            errorMessage.style.display = "none";
            
            const invalidSlots = [];
            const occupiedSlots = [];
            const validSlots = [];
            
            slots.forEach(slot => {
                let found = false;
                let occupied = false;
                
                document.querySelectorAll("td").forEach(cell => {
                    if (cell.dataset.slot === slot) {
                        found = true;
                        
                        if (cell.classList.contains("occupied") || cell.classList.contains("tentative")) {
                            occupied = true;
                            occupiedSlots.push(slot);
                        } else {
                            validSlots.push(slot);
                            cell.classList.add('highlighted');
                        }
                    }
                });
                
                if (!found) {
                    invalidSlots.push(slot);
                }
            });
            
            if (invalidSlots.length > 0 || occupiedSlots.length > 0) {
                let errorMessages = [];
                
                if (invalidSlots.length > 0) {
                    errorMessages.push(`Invalid slot(s): ${invalidSlots.join(", ")}`);
                }
                
                if (occupiedSlots.length > 0) {
                    errorMessages.push(`Occupied slot(s): ${occupiedSlots.join(", ")}`);
                }
                
                showSlotError(errorMessages.join(". "));
            }
            
            selectedSlots = [...validSlots];
            document.getElementById('selectedCount').textContent = selectedSlots.length;
            
            selectedSlots.forEach((slot, index) => {
                const element = document.querySelector(`td[data-slot="${slot}"]`);
                if (element) {
                    element.classList.add('selected');
                    
                    const counter = document.createElement('div');
                    counter.className = 'selection-counter';
                    counter.textContent = index + 1;
                    element.appendChild(counter);
                }
            });
        }
        
        function resetTable() {
            document.querySelectorAll("td").forEach(cell => {
                if (cell.dataset.slot) {
                    cell.innerHTML = `<span class="slot-code">${cell.dataset.slot}</span>`;
                    cell.style.backgroundColor = "";
                    cell.style.color = "";
                    cell.classList.remove('occupied', 'highlighted', 'selected', 'tentative');
                    cell.classList.add('selectable');
                    cell.querySelector('.selection-counter')?.remove();
                    cell.querySelector('.tentative-badge')?.remove();
                    cell.querySelector('.color-group-indicator')?.remove();
                }
            });
            
            document.getElementById("coursesList").innerHTML = "";
            
            courses.length = 0;
            
            // Clear tentative slots
            for (const slot in tentativeSlots) {
                delete tentativeSlots[slot];
            }
            
            // Reset color group counter
            colorGroupCounter = 1;
            
            // Clear search box and error message
            document.getElementById("searchBox").value = "";
            document.getElementById("slotErrorMessage").style.display = "none";
            
            selectedSlots = [];
            document.getElementById('selectedCount').textContent = '0';
            
            updateStats();
            updateTentativeList();
        }
        
        function downloadTimetableAsImage(e) {
            if (e) e.preventDefault();
            
            toggleDownloadDropdown();
            
            const element = document.getElementById('timetableToDownload');
            
            html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#1a252f"
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = imgData;
                link.download = 'timetable.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
        
        function downloadTimetableAsPDF(e) {
            if (e) e.preventDefault();
            
            toggleDownloadDropdown();
            
            const element = document.getElementById('timetableToDownload');
            
            html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#1a252f"
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jspdf.jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                });
                
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save('timetable.pdf');
            });
        }
        
        function highlightSlots() {
            const searchValue = document.getElementById("searchBox").value.toUpperCase().trim();
            const slots = searchValue.split("+").filter(s => s !== '');
            const errorMessage = document.getElementById("slotErrorMessage");
            
            // Reset previous highlights and selections
            document.querySelectorAll(".selectable").forEach(cell => {
                cell.classList.remove('highlighted', 'selected');
                cell.querySelector('.selection-counter')?.remove();
            });
            
            errorMessage.textContent = "";
            errorMessage.style.display = "none";
            
            // Validate slots
            const invalidSlots = [];
            const occupiedSlots = [];
            const validSlots = [];
            
            // Clear current selection
            selectedSlots = [];
            
            slots.forEach(slot => {
                let found = false;
                let occupied = false;
                let tentative = false;
                
                document.querySelectorAll("td").forEach(cell => {
                    if (cell.dataset.slot === slot) {
                        found = true;
                        
                        if (cell.classList.contains("occupied")) {
                            occupied = true;
                            occupiedSlots.push(slot);
                        } 
                        else if (cell.classList.contains("tentative")) {
                            tentative = true;
                        }
                        
                        // Add to valid slots if not occupied
                        if (!occupied) {
                            validSlots.push(slot);
                            cell.classList.add('highlighted');
                        }
                    }
                });
                
                if (!found) {
                    invalidSlots.push(slot);
                }
            });
            
            if (invalidSlots.length > 0 || occupiedSlots.length > 0) {
                let errorMessages = [];
                
                if (invalidSlots.length > 0) {
                    errorMessages.push(`Invalid slot(s): ${invalidSlots.join(", ")}`);
                }
                
                if (occupiedSlots.length > 0) {
                    errorMessages.push(`Occupied slot(s): ${occupiedSlots.join(", ")}`);
                }
                
                showSlotError(errorMessages.join(". "));
            }
            
            selectedSlots = [...validSlots];
            document.getElementById('selectedCount').textContent = selectedSlots.length;
            
            selectedSlots.forEach((slot, index) => {
                const element = document.querySelector(`td[data-slot="${slot}"]`);
                if (element) {
                    element.classList.add('selected');
                    
                    // Add counter badge
                    const counter = document.createElement('div');
                    counter.className = 'selection-counter';
                    counter.textContent = index + 1;
                    element.appendChild(counter);
                }
            });
        }
        
        function saveSelection() {
            if (selectedSlots.length === 0) {
                showSlotError("Please select at least one slot to save");
                return;
            }
            
            const occupied = [];
            selectedSlots.forEach(slot => {
                const element = document.querySelector(`td[data-slot="${slot}"]`);
                if (element && element.classList.contains('occupied')) {
                    occupied.push(slot);
                }
            });
            
            if (occupied.length > 0) {
                showSlotError(`Slot(s) ${occupied.join(", ")} are already occupied`);
                return;
            }
            
            selectedColor = getNextAvailableColor();
            
            openCourseModal();
        }
        
        function convertTentativeGroup(groupId) {
            const slots = Object.keys(tentativeSlots).filter(slot => 
                tentativeSlots[slot].groupId == groupId
            );
            
            const occupiedSlots = [];
            slots.forEach(slot => {
                const element = document.querySelector(`td[data-slot="${slot}"]`);
                if (element && element.classList.contains('occupied')) {
                    occupiedSlots.push(slot);
                }
            });
            
            if (occupiedSlots.length > 0) {
                showSlotError(`Slot(s) ${occupiedSlots.join(", ")} are already occupied`);
                return;
            }
            
            selectedSlots = [...slots];
            
            const firstSlot = slots[0];
            selectedColor = tentativeSlots[firstSlot].color;
            
            // Open course modal
            openCourseModal();
        }
        
        function convertSingleTentative(slot) {
            const element = document.querySelector(`td[data-slot="${slot}"]`);
            if (element && element.classList.contains('occupied')) {
                showSlotError(`Slot ${slot} is already occupied`);
                return;
            }
            
            selectedSlots = [slot];
            selectedColor = tentativeSlots[slot].color;
            openCourseModal();
        }
        
        function saveCourse() {
            const courseName = document.getElementById('courseName').value.trim();
            const courseCode = document.getElementById('courseCode').value.trim();
            const teacherName = document.getElementById('teacherName').value.trim();
            
            const occupiedSlots = [];
            selectedSlots.forEach(slot => {
                const element = document.querySelector(`td[data-slot="${slot}"]`);
                if (element && element.classList.contains('occupied')) {
                    occupiedSlots.push(slot);
                }
            });
            
            if (occupiedSlots.length > 0) {
                showError(
                    `Slot(s) ${occupiedSlots.join(", ")} are now occupied by another course`,
                    `Please try different slots`
                );
                return;
            }
            
            const course = {
                name: courseName || "Unnamed Course",
                code: courseCode || "",
                teacher: teacherName || "",
                slots: [...selectedSlots],
                color: selectedColor
            };
            
            courses.push(course);
            
            selectedSlots.forEach(slot => {
                const slotElement = document.querySelector(`td[data-slot="${slot}"]`);
                if (slotElement) {
                    // Remove tentative marking if it exists
                    if (tentativeSlots[slot]) {
                        slotElement.classList.remove('tentative');
                        slotElement.querySelector('.tentative-badge')?.remove();
                        slotElement.querySelector('.color-group-indicator')?.remove();
                        delete tentativeSlots[slot];
                    }
                    
                    slotElement.innerHTML = `<span class="slot-code">${slot} (${course.name})</span>`;
                    slotElement.style.backgroundColor = selectedColor;
                    
                    const hexColor = selectedColor.replace('#', '');
                    if (hexColor.length === 6) {
                        const r = parseInt(hexColor.substr(0,2), 16);
                        const g = parseInt(hexColor.substr(2,2), 16);
                        const b = parseInt(hexColor.substr(4,2), 16);
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        slotElement.style.color = brightness > 128 ? "#000000" : "#ffffff";
                    } else {
                        slotElement.style.color = "#ffffff";
                    }
                    
                    slotElement.classList.add('occupied');
                    slotElement.classList.remove('selectable', 'selected', 'highlighted');
                    slotElement.querySelector('.selection-counter')?.remove();
                }
            });
            
            addCourseToList(course);
            
            closeCourseModal();
            updateStats();
            updateTentativeList();
            selectedSlots = [];
            document.getElementById('selectedCount').textContent = '0';
        }
        
function toggleSlotSelection(slotElement) {
    const slot = slotElement.dataset.slot;
    
    if (slotElement.classList.contains('occupied')) return;
    
    if (slotElement.classList.contains('selected')) {
        slotElement.classList.remove('selected');
        slotElement.classList.remove('highlighted'); // Stop blinking by removing highlighted class
        slotElement.querySelector('.selection-counter')?.remove();
        
        const index = selectedSlots.indexOf(slot);
        if (index !== -1) {
            selectedSlots.splice(index, 1);
        }
    } else {
        slotElement.classList.add('selected');
        slotElement.classList.add('highlighted'); // Start blinking by adding highlighted class
        
        const counter = document.createElement('div');
        counter.className = 'selection-counter';
        counter.textContent = selectedSlots.length + 1;
        slotElement.appendChild(counter);
        
        selectedSlots.push(slot);
    }
    
    document.getElementById('selectedCountText').textContent = selectedSlots.length;
    document.getElementById('selectedCount').textContent = selectedSlots.length;
}

// Toggle usage notes section
function toggleUsageNotes() {
    const content = document.querySelector('.usage-notes-content');
    const toggle = document.querySelector('.usage-notes-toggle');
    const icon = toggle.querySelector('i');
    const span = toggle.querySelector('span');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        icon.className = 'fas fa-chevron-up';
        span.textContent = 'Hide Tips';
    } else {
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
        icon.className = 'fas fa-chevron-down';
        span.textContent = 'Show Tips';
    }
}
