window.addEventListener('DOMContentLoaded', function() {
	const cardEl = document.querySelector('.physicians_component');
	const listEl = document.querySelector('.physicians-list');
	const storage = sessionStorage.getItem('zweitmeinung-specialty-list');
	let resultsCategory = null;
	const a = window.location.search;
	const params = new URLSearchParams(a);
	const specId = params.get('spec');

	if (storage != "undefined" && !specId) {
		resultsCategory = JSON.parse(storage);
	} else if (specId) {
		searchPhysicians(specId)
		sessionStorage.setItem('zweitmeinung-specialty-search', specId);
		params.delete('spec')
	}
	if (!resultsCategory || resultsCategory.length === 0) {
		const requestCategory = sendRequest('GET', `slots/criteria/`, null)
		requestCategory.then(responseData => {
			resultsCategory = responseData[0].values;
			sessionStorage.setItem('zweitmeinung-specialty-list', JSON.stringify(resultsCategory));
			initSearchBar(resultsCategory);
		})
	} else {
		initSearchBar(resultsCategory)
	}

	function initSearchBar(resultsCategory) {
		const dropdownCategoryNav = document.querySelector('#field-nav')
		const dropdownCategoryMobile = document.querySelector('#field-mobile')
		addOptions(resultsCategory, dropdownCategoryNav);
		addOptions(resultsCategory, dropdownCategoryMobile);
		const searchValue = sessionStorage.getItem('zweitmeinung-specialty-search')
		if (searchValue) {
			dropdownCategoryNav.value = searchValue;
			dropdownCategoryMobile.value = searchValue;
			searchPhysicians(searchValue);
		}

		const searchBtnNav = document.querySelector('#search-btn-nav')
		const searchBtnMobile = document.querySelector('#search-btn-mobile')
		const arr = [searchBtnNav, searchBtnMobile];

		for (let i = 0; i < arr.length; i++) {
			arr[i].addEventListener('click', function handleClick(ev) {
				let val = 0;
				if (ev.srcElement.id.indexOf('-nav') > -1) {
					val = dropdownCategoryNav.value;
					dropdownCategoryMobile.value = val;
				} else {
					val = dropdownCategoryMobile.value
					dropdownCategoryNav.value = val
				}
				sessionStorage.setItem('zweitmeinung-specialty-search', val);

				const info = document.getElementById('empty-state');
				info.style.display = "none";

				const cards = document.getElementsByClassName('physician-item')
				while (cards.length > 0) {
					cards[0].remove()
				}
				if (val) {
					searchPhysicians(val);
				} else {
					const info = document.getElementById('empty-state');
					info.style.display = "block";
				}
			})
		}
	}

	function addOptions(results, dropdown) {
		results.forEach(item => {
			const optElement = document.createElement('option')
			optElement.value = item.id;
			optElement.innerText = item.name;
			dropdown.appendChild(optElement);
		})
	}

	function searchPhysicians(specCode) {
		var d = new Date();
		const slots_after = formatDate(d)
		d.setMonth(d.getMonth() + 3);
		const slots_before = formatDate(d)
		let request = sendRequest('GET',
			`organizations/healthcare-services/slots?criteria_values=${specCode}&slots_before=${slots_before}&slots_after=${slots_after}`,
			null)
		request.then(responseData => {
			const results = responseData.results;
			const info = document.getElementById('empty-state');
			if (results.length > 0) {
				info.style.display = "none";
				populateTimetable(results)
			} else {
				info.style.display = "block";
			}
		})
	}

	function populateTimetable(results) {
		results.forEach((doc, i) => {
			if (doc.slots.length == 0) return
			let card = cardEl.cloneNode(true);
			card.classList.remove('visually-hidden');
			card.removeAttribute('data-base-card')
			card.classList.add('physician-item');
			card.querySelector('#physician-name').innerText = doc.name;
			card.querySelector('#physician-fee').innerText = doc.price.amount + '/h';
			card.querySelector('#physician-specialty').innerText = doc.categories[0].name;
			card.querySelector('.image-cover').src =
				'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=880&q=80'
			
			if(doc && doc.managing_user && doc.managing_user.practitioner && doc.managing_user.practitioner.image) {
				card.querySelector('.image-cover').src = doc.managing_user.practitioner.image.file;
			} 
			   
			doc.slots =
				_.chain(doc.slots)
				.map(slot => {
					const split = slot.date_from.split('T')
					slot.date = split[0]
					slot.hour = split[1]
					delete slot.date_from
					return slot;
				})
				.groupBy("date")
				.map((value, key) => ({
					date: key,
					hours: value
				}))
				.value()
			let slotsWrapper = card.querySelector('.physicians_slots-wrapper')
			let slideContainer = card.querySelector('.slots_content')
			let slidePage = document.createElement("div")
			slideContainer.id = 'slider-' + i
			slideContainer.classList.add('hideContent')
			slidePage.classList.add('slide-page')
			slidePage.style.display = "flex";

			let dayCounter = 0;
			let slidePageClone = slidePage.cloneNode(true)

			doc.slots.forEach((slot, index) => {

				if (dayCounter >= 4) {
					slideContainer.append(slidePageClone)
					slidePageClone = slidePage.cloneNode(true)
					dayCounter = 0;
				}
				dayCounter++

				let slotColumn = document.createElement("div")
				let splitDate = slot.date.split('-')
				slotColumn.classList.add('slots_day')
				slotColumn.innerHTML =
					`<div class='slots_day-header'>
	  <div class="text_size-medium">${setDayName(slot.date)}</div>
	  <div class="text_size-small text_color-gray">${splitDate[2]}.${splitDate[1]}</div>
	  </div>
	  <div class="slots_day-hours">`

				let btnHook = slotColumn.querySelector(".slots_day-hours")
				slot.hours.forEach(item => {
					let btn = document.createElement("a")
					let hourArr = item.hour.split(':')
					btn.innerHTML = `<div class="text_size-medium">${hourArr[0]}:${hourArr[1]}</div>`
					btn.classList.add('test-slots_hour')
					btn.classList.add('w-inline-block')
					if (item.status === 'FREE') {
						btn.classList.add('slot-active')
						btn.href = 'https://app-staging.medrefer.de/b/sec/book/' + item.key
					} else {
						btn.classList.add('slot-inactive')
					}
					btnHook.appendChild(btn)
				})
				//add last few columns
				slidePageClone.appendChild(slotColumn);
				slideContainer.append(slidePageClone)
			})
			slotsWrapper.append(slideContainer)
			cardEl.after(card)
			let slider = tns({
				container: '#' + slideContainer.id,
				items: 1,
				slideBy: 'page',
				nav: false,
				controls: true,
				rewind: false,
				loop: false,
				controlsText: [
					'<div class="slots_arrow-wrapper btn-left"><img src="https://uploads-ssl.webflow.com/628be9abfa77a2e744cdac5f/62c81523d5c3fbbacd686126_expand_circle_left.svg" loading="lazy" alt=""></div>',
					'<div class="slots_arrow-wrapper btn-right"><img src="https://uploads-ssl.webflow.com/628be9abfa77a2e744cdac5f/62c8152412be42ad04db4bf0_expand_circle_right.svg" loading="lazy" alt=""></div>'
				]
			});

			createShowMoreBtn(slotsWrapper, slideContainer, slider)

			slider.events.on('indexChanged', () => {
				hideShowMoreBtn(slotsWrapper, slideContainer, slider)
			});
		})
	}

	function hideShowMoreBtn(slotsWrapper, slideContainer, slider) {
		const btn = slotsWrapper.querySelector(".show-more")
		const itemsCount = getItemsCount(slider);
		if (itemsCount < 4) {
			btn.style.visibility = "hidden"
		} else {
			btn.style.visibility = "visible"
		}
		changeContainerHeight(slideContainer, slider);
	}

	function getItemsCount(slider) {
		const info = slider.getInfo()
		let itemsCount = 0
		for (let item of info.slideItems[info.index].children) {
			itemsCount = itemsCount > item.children[1].childElementCount ?
				itemsCount :
				item.children[1].childElementCount
		}
		return itemsCount
	}

	function changeContainerHeight(slideContainer, slider) {
		const itemHeight = slideContainer.querySelector('.test-slots_hour').clientHeight;
		const defaultContainerHeight = itemHeight > 50 ? '290px' : '260px';
		if (!slideContainer.classList.contains('hideContent')) {
			const itemsCount = getItemsCount(slider);
			const containerHeight =
				itemHeight > 50 ?
				itemsCount * (itemHeight + 11) + 65 :
				itemsCount * (itemHeight + 8) + 65;

			slideContainer.style.height = containerHeight < defaultContainerHeight ?
				defaultContainerHeight :
				`${containerHeight}px`
		} else {
			slideContainer.style.height = defaultContainerHeight;
		}
	}

	function createShowMoreBtn(wraper, container, slider) {
		const btn = document.createElement("button")
		btn.classList.add('show-more');
		btn.innerHTML = "Zobacz więcej";
		btn.addEventListener('click', function handleClick(event) {
			if (event.target.innerText === "Zobacz więcej") {
				container.classList.remove('hideContent')
				btn.innerHTML = "Schowaj";
				changeContainerHeight(container, slider)
			} else {
				container.classList.add('hideContent')
				btn.innerHTML = "Zobacz więcej";
				changeContainerHeight(container, slider)
			}
		});
		wraper.append(btn)
		hideShowMoreBtn(wraper, container, slider)
	}

	function setDayName(date) {
		const today = formatDate(new Date());
		let tomorrow = new Date();
		tomorrow = formatDate(tomorrow.setDate(tomorrow.getDate() + 1));
		const dateStr = formatDate(date)
		if (today === dateStr) {
			return 'Heute'
		} else if (tomorrow === dateStr) {
			return 'Morgen'
		} else {
			return getDayName(dateStr, "de-DE");
		}
	}

	function getDayName(dateStr, locale) {
		var date = new Date(dateStr);
		return date.toLocaleDateString(locale, {
			weekday: 'short'
		});
	}

	function formatDate(date) {
		var d = new Date(date),
			month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear();

		if (month.length < 2)
			month = '0' + month;
		if (day.length < 2)
			day = '0' + day;
		return [year, month, day].join('-') + 'T00:00:00Z';
	}
}) 
