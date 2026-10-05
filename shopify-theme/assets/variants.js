class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.doIshiTasks();
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant || !this.currentVariant?.featured_media) return;
    const newMedia = document.querySelector(
      `[data-media-id="${this.dataset.section}-${this.currentVariant.featured_media.id}"]`
    );
    if (!newMedia) return;
    //const parent = newMedia.parentElement;
    //parent.prepend(newMedia);
    //window.setTimeout(() => { parent.scroll(0, 0) });
    document.getElementById('main-media-container').innerHTML = "";
    document.getElementById('main-media-container').prepend(newMedia.cloneNode(true));
        
  }

  updateURL() {
    if (!this.currentVariant) return;
    window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant?.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  renderProductInfo() {
    fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
      .then((response) => response.text())
      .then((responseText) => {
        const id = `price-${this.dataset.section}`;
        const html = new DOMParser().parseFromString(responseText, 'text/html')
        const destination = document.getElementById(id);
        const source = html.getElementById(id);

        if (source && destination) destination.innerHTML = source.innerHTML;

        document.getElementById(`price-${this.dataset.section}`)?.classList.remove('visibility-hidden');
        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const addButton = document.getElementById(`product-form-${this.dataset.section}`)?.querySelector('[name="add"]');

    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', true);
      if (text) addButton.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButton.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const addButton = document.getElementById(`product-form-${this.dataset.section}`)?.querySelector('[name="add"]');
    if (!addButton) return;
    addButton.textContent = window.variantStrings.unavailable;
    document.getElementById(`price-${this.dataset.section}`)?.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }

  doIshiTasks() {
	var variant = this.currentVariant;
    var skuTarget = document.querySelector(".variant-sku");
	if (typeof(skuTarget) != 'undefined' && skuTarget != null) {
		document.querySelector(".variant-sku").innerHTML = variant.sku;
	}
    if (document.getElementsByClassName("ishi-progress-content").length) {
	  var stock = 0;
      var variantSpan =  document.getElementById("variant-" + variant.id);
      if (typeof(variantSpan) != 'undefined' && variantSpan != null)
      {
      	stock = parseInt(variantSpan.getAttribute("data-stock"));
      }
      var maxqty = parseInt(document.getElementsByClassName("ishi-progress-content")[0].getAttribute("data-quantity"));
	  document.getElementById("variant-stock").innerHTML = stock;
      if(stock > 0 && stock <= maxqty) {
        document.getElementsByClassName("ishi-progress-content")[0].classList.remove("hidden");
		var progressSpan =  document.getElementById("ishi-progress-bar").getElementsByTagName("span")[0];
		switch(stock){case 9:progressSpan.style.width = "65%";break;case 8:progressSpan.style.width = "60%";break;case 7:progressSpan.style.width = "55%";break;case 6:progressSpan.style.width = "50%";break;case 5:progressSpan.style.width = "45%";break;case 4:progressSpan.style.width = "30%";break;case 3:progressSpan.style.width = "20%";break;case 2:progressSpan.style.width = "10%";break;case 1:progressSpan.style.width = "5%";break;default:progressSpan.style.width = "90%";}
     } else {
         document.getElementsByClassName("ishi-progress-content")[0].classList.add("hidden");
      }
	} 

  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }
}

customElements.define('variant-radios', VariantRadios);
