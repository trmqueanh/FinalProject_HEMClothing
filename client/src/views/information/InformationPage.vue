<template>
  <div
    class="page-section information-page"
    :class="{ 'information-page--size-guide': pageKey === 'size-guide' }"
  >
    <PageBreadcrumbs :items="breadcrumbItems" />

    <header class="information-hero">
      <h1>{{ page.title }}</h1>
    </header>

    <div v-if="page.facts && page.facts.length" class="information-facts" :aria-label="`${page.title} highlights`">
      <article v-for="fact in page.facts" :key="fact.label" class="information-fact">
        <span>{{ fact.label }}</span>
        <strong>{{ fact.value }}</strong>
        <small>{{ fact.detail }}</small>
      </article>
    </div>

    <div class="information-layout">
      <aside class="information-nav" aria-label="On this page">
        <p>On this page</p>
        <a
          v-for="section in page.sections"
          :key="section.id"
          :href="`#${section.id}`"
          :class="{ 'is-active': activeSectionId === section.id }"
          :aria-current="activeSectionId === section.id ? 'location' : undefined"
          @click="activateSection(section.id)"
        >
          {{ section.title }}
        </a>
      </aside>

      <main class="information-content">
        <section
          v-for="(section, sectionIndex) in page.sections"
          :id="section.id"
          :key="section.id"
          class="information-section"
        >
          <span class="information-section__number">{{ String(sectionIndex + 1).padStart(2, '0') }}</span>

          <div class="information-section__body">
            <h2>{{ section.title }}</h2>

            <p v-for="paragraph in section.paragraphs || []" :key="paragraph">
              {{ paragraph }}
            </p>

            <ul v-if="section.items && section.items.length">
              <li v-for="item in section.items" :key="item">
                {{ item }}
              </li>
            </ul>

            <ol v-if="section.steps && section.steps.length" class="information-steps">
              <li v-for="step in section.steps" :key="step.title">
                <span>{{ step.title }}</span>
                <p>{{ step.detail }}</p>
              </li>
            </ol>

            <div
              v-if="section.tables && section.tables.length"
              class="size-tables"
              :class="{ 'size-tables--three': section.tables.length === 3 }"
            >
              <article v-for="table in section.tables" :key="table.title" class="size-table-card">
                <div class="size-table-card__header">
                  <h3>{{ table.title }}</h3>
                  <span>{{ table.note }}</span>
                </div>

                <div class="size-table-card__scroll">
                  <table>
                    <thead>
                      <tr>
                        <th v-for="column in table.columns" :key="column">{{ column }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in table.rows" :key="`${table.title}-${rowIndex}`">
                        <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            <div v-if="section.note" class="information-note">
              <strong>{{ section.note.title }}</strong>
              <p>{{ section.note.detail }}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script>
import PageBreadcrumbs from '../../components/common/PageBreadcrumbs.vue';

const SHOE_COLUMNS = ['EU', 'UK', 'US', 'Foot length (cm)'];

const PAGES = {
  'size-guide': {
    eyebrow: 'Shopping assistance',
    title: 'Size guide',
    introduction: 'Find a comfortable fit by measuring before you order. Product-specific size information remains the best reference whenever it is available.',
    facts: [
      { label: 'Measure', value: 'Close to the body', detail: 'Keep the tape level without pulling it tight.' },
      { label: 'Compare', value: 'Use the product guide', detail: 'Open Size Guide on the product detail page.' },
      { label: 'Between sizes', value: 'Choose for your fit', detail: 'Size up for ease or down for a closer fit.' }
    ],
    sections: [
      {
        id: 'how-to-measure',
        title: 'How to measure',
        items: [
          'Chest: measure around the fullest part of your chest, keeping the tape horizontal.',
          'Waist: measure around your natural waistline without holding your breath.',
          'Hip: stand with your feet together and measure around the fullest part of your hips.',
          'Inside leg: measure from the top of the inner leg down to the floor.',
          'Foot length: stand on a sheet of paper, mark heel and longest toe, then measure between the marks.'
        ]
      },
      {
        id: 'clothing-sizes',
        title: 'Clothing size chart',
        paragraphs: [
          'Use your body measurements to choose the closest letter size. The catalogue supports XS–XXL for clothing and 24–33 for selected trousers and jeans. All measurements below are in centimetres unless stated otherwise.'
        ],
        tables: [
          {
            title: 'Women’s clothing',
            note: 'Body measurements',
            columns: ['Size', 'Chest', 'Waist', 'Hip'],
            rows: [
              ['XS', '80–84', '64–68', '88–92'],
              ['S', '84–88', '68–72', '92–96'],
              ['M', '88–96', '72–80', '96–104'],
              ['L', '96–104', '80–88', '104–112'],
              ['XL', '104–112', '88–96', '112–120'],
              ['XXL', '112–120', '96–104', '120–128']
            ]
          },
          {
            title: 'Men’s clothing',
            note: 'Body measurements',
            columns: ['Size', 'Chest', 'Waist', 'Hip'],
            rows: [
              ['XS', '84–88', '72–76', '88–92'],
              ['S', '88–92', '76–80', '92–96'],
              ['M', '92–100', '80–88', '96–104'],
              ['L', '100–108', '88–96', '104–112'],
              ['XL', '108–116', '96–104', '112–120'],
              ['XXL', '116–124', '104–112', '120–128']
            ]
          },
          {
            title: 'Trousers & jeans',
            note: 'Waist reference',
            columns: ['Size', 'Inches', 'Waist (cm)'],
            rows: [
              ['24', '24', '61'],
              ['25', '25', '64'],
              ['26', '26', '66'],
              ['27', '27', '69'],
              ['28', '28', '71'],
              ['29', '29', '74'],
              ['30', '30', '76'],
              ['31', '31', '79'],
              ['32', '32', '81'],
              ['33', '33', '84']
            ]
          }
        ],
        note: {
          title: 'Fit matters',
          detail: 'These are general body-size references. Fabric stretch, rise, cut, and intended silhouette can change the fit of an individual product.'
        }
      },
      {
        id: 'product-sizing',
        title: 'Product-specific sizing',
        paragraphs: [
          'Sizes can vary by category, cut, and silhouette. On supported product pages, select “Size Guide” beside the size options to view the chart assigned to that exact product category.',
          'The available size buttons also reflect the product variants currently carried by HEM. Atelier. A disabled size is unavailable for the selected colour and is not a sizing recommendation.'
        ],
        note: {
          title: 'Best reference',
          detail: 'If a product-specific chart differs from this general guide, follow the chart shown on the product detail page.'
        }
      },
      {
        id: 'shoe-conversion',
        title: 'Shoe size conversion',
        paragraphs: [
          'Measure both feet and use the longer measurement. The tables below match the women’s and men’s shoe guides currently used in the catalogue.'
        ],
        tables: [
          {
            title: 'Women',
            note: 'EU 35–42',
            columns: SHOE_COLUMNS,
            rows: [
              ['35', '2.5', '5', '22.0'],
              ['36', '3.5', '6', '22.9'],
              ['37', '4', '6.5', '23.7'],
              ['38', '5', '7.5', '24.6'],
              ['39', '6', '8.5', '25.4'],
              ['40', '6.5', '9', '25.8'],
              ['41', '7.5', '10', '26.7'],
              ['42', '8', '10.5', '27.1']
            ]
          },
          {
            title: 'Men',
            note: 'EU 39–46',
            columns: SHOE_COLUMNS,
            rows: [
              ['39', '5.5', '6.5', '24.6'],
              ['40', '6.5', '7.5', '25.4'],
              ['41', '7', '8', '26.2'],
              ['42', '8', '9', '27.1'],
              ['43', '9', '10', '27.9'],
              ['44', '9.5', '10.5', '28.4'],
              ['45', '10.5', '11.5', '29.2'],
              ['46', '11', '12', '29.6']
            ]
          }
        ]
      }
    ]
  },
  'shipping-policy': {
    eyebrow: 'Orders & delivery',
    title: 'Shipping policy',
    introduction: 'A clear overview of delivery charges, addresses, and order tracking for purchases made through HEM. Atelier.',
    facts: [
      { label: 'Destination', value: 'Vietnam', detail: 'Province, district, ward, and street address required.' },
      { label: 'Standard delivery', value: '₫30,000', detail: 'Applied when the merchandise subtotal is below ₫500,000.' },
      { label: 'Free delivery', value: 'From ₫500,000', detail: 'Calculated automatically before voucher discounts.' }
    ],
    sections: [
      {
        id: 'delivery-area',
        title: 'Where we deliver',
        paragraphs: [
          'HEM. Atelier currently accepts delivery addresses in Vietnam. At checkout, provide the recipient’s full name, Vietnamese mobile number, province or city, district, ward, and street address.',
          'You may save an address to your account, set a default address, or add an optional note for the delivery partner.'
        ]
      },
      {
        id: 'fees',
        title: 'Shipping fees',
        items: [
          'Orders with a merchandise subtotal of ₫500,000 or more receive free standard delivery.',
          'Orders below ₫500,000 are charged a standard delivery fee of ₫30,000.',
          'The final shipping fee is shown in the order summary before you place the order.'
        ]
      },
      {
        id: 'tracking',
        title: 'Order progress',
        paragraphs: [
          'Signed-in customers can follow an order from My Account under Orders. Status updates cover confirmation, processing, shipping, delivery, and completion.',
          'Please keep your phone available while an order is out for delivery. If delivery cannot be completed, contact Customer Care so the address or next step can be reviewed.'
        ]
      },
      {
        id: 'payment',
        title: 'Payment and dispatch',
        paragraphs: [
          'Cash on Delivery orders are paid when the parcel arrives. Bank transfer orders use VietQR and must be completed within the payment window shown at checkout.',
          'A bank transfer may require review before the order moves into fulfilment. You can return to the payment page from your order details while payment is still available.'
        ]
      }
    ]
  },
  'refund-policy': {
    eyebrow: 'Returns & refunds',
    title: 'Return policy',
    introduction: 'Eligible items can be submitted for review through your order details within the return window shown in your account.',
    facts: [
      { label: 'Request window', value: 'Within 3 days', detail: 'Counted from the recorded delivery time.' },
      { label: 'Request from', value: 'My Account', detail: 'Open Orders and select the delivered order.' },
      { label: 'Refund method', value: 'Bank transfer', detail: 'Approved refunds require valid bank account details.' }
    ],
    sections: [
      {
        id: 'eligibility',
        title: 'Return eligibility',
        paragraphs: [
          'A return can be requested only after an order is marked Delivered or Completed and before the three-day return window expires.',
          'You may select specific products and quantities. Available reasons include wrong size, not as expected, changed mind, defective, or other. The final accepted quantity and refund amount depend on inspection.'
        ]
      },
      {
        id: 'request',
        title: 'How to request a return',
        steps: [
          { title: 'Open the order', detail: 'Sign in, go to My Account, choose Orders, and open the delivered order.' },
          { title: 'Select the items', detail: 'Choose each product and quantity you want to return, then provide a reason and supporting note.' },
          { title: 'Add evidence', detail: 'Attach clear product photos when they help explain the request, especially for a defect or incorrect item.' },
          { title: 'Track the review', detail: 'Follow the return status from the same order detail page and wait for return instructions.' }
        ]
      },
      {
        id: 'inspection',
        title: 'Review and inspection',
        paragraphs: [
          'Submitting a request does not automatically approve a refund. HEM. Atelier reviews the request, confirms whether the item should be sent back, and inspects received items.',
          'A request or individual quantity may be rejected if it is not accepted during review or inspection. The return timeline in your order details records each decision.'
        ]
      },
      {
        id: 'refund',
        title: 'Receiving your refund',
        paragraphs: [
          'When a return is approved for refund, enter the requested bank name, account number, and account holder in your order details. This applies to refunds for both Cash on Delivery and bank transfer purchases.',
          'The refundable merchandise amount is calculated from the amount paid for the accepted item quantity, after order-level discounts. Processing status remains visible until the refund is completed.'
        ],
        note: {
          title: 'Keep your details accurate',
          detail: 'Refund account information can only be updated during the eligible stage before refund processing begins.'
        }
      }
    ]
  },
  'privacy-policy': {
    eyebrow: 'Privacy & data',
    title: 'Privacy policy',
    introduction: 'This page explains the information HEM. Atelier uses to provide accounts, orders, support, and a consistent shopping experience.',
    facts: [
      { label: 'Checkout', value: 'Account required', detail: 'Orders are connected to the signed-in customer.' },
      { label: 'Payments', value: 'COD or VietQR', detail: 'The store does not collect payment-card details.' },
      { label: 'Contact', value: 'You stay in control', detail: 'Ask Customer Care about your account information.' }
    ],
    sections: [
      {
        id: 'information-collected',
        title: 'Information we collect',
        items: [
          'Account details such as name, email address, phone number, and encrypted password credentials.',
          'Saved delivery addresses, order notes, order history, selected products, and payment method.',
          'Bank account details only when they are needed to complete an approved refund.',
          'Favorites, product reviews, return requests, uploaded return evidence, and Customer Care communications.',
          'Technical browser data needed to keep you signed in and remember selected shopping preferences.'
        ]
      },
      {
        id: 'information-use',
        title: 'How information is used',
        items: [
          'To create and secure your account, including email verification and password recovery.',
          'To validate stock, place orders, deliver purchases, receive payment, process cancellations, returns, and refunds.',
          'To show your cart, favorites, addresses, order history, vouchers, and reviews across the storefront.',
          'To send essential account, payment, delivery, return, and refund notifications.',
          'To protect the store from misuse and maintain reliable commerce records.'
        ]
      },
      {
        id: 'browser-storage',
        title: 'Browser storage',
        paragraphs: [
          'HEM. Atelier uses local or session browser storage for the signed-in session, recent search history, checkout selections, location data cache, and interface state. These features help the storefront work consistently between pages.',
          'Clearing your browser storage may sign you out and remove locally remembered searches or temporary selections. Essential order and account records remain connected to your account.'
        ]
      },
      {
        id: 'payments-security',
        title: 'Payments and security',
        paragraphs: [
          'Checkout supports Cash on Delivery and bank transfer through VietQR. HEM. Atelier does not ask for or store credit or debit card numbers.',
          'Account access is protected by authentication controls. Access to customer data and store-management features is restricted according to account role.'
        ]
      },
      {
        id: 'your-choices',
        title: 'Your choices',
        paragraphs: [
          'You can update profile information, manage saved addresses, change your password, and review your orders from My Account.',
          'For questions about stored information or an account request that is not available in My Account, contact Customer Care using the details below.'
        ]
      }
    ]
  }
};

export default {
  name: 'InformationPage',
  components: {
    PageBreadcrumbs
  },
  data() {
    return {
      activeSectionId: '',
      sectionScrollFrame: null
    };
  },
  computed: {
    pageKey() {
      return String(this.$route.meta.informationPage || 'size-guide');
    },
    page() {
      return PAGES[this.pageKey] || PAGES['size-guide'];
    },
    breadcrumbItems() {
      return [
        {
          label: 'HEM.COM',
          route: { path: '/women' }
        },
        {
          label: this.page.title,
          current: true
        }
      ];
    }
  },
  mounted() {
    const hashSectionId = String(this.$route.hash || '').replace(/^#/, '');
    const hasHashSection = this.page.sections.some(section => section.id === hashSectionId);

    this.activeSectionId = hasHashSection ? hashSectionId : this.page.sections[0].id;
    window.addEventListener('scroll', this.scheduleSectionSync, { passive: true });
    window.addEventListener('resize', this.scheduleSectionSync);
    this.$nextTick(this.syncActiveSection);
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.scheduleSectionSync);
    window.removeEventListener('resize', this.scheduleSectionSync);

    if (this.sectionScrollFrame !== null) {
      window.cancelAnimationFrame(this.sectionScrollFrame);
    }
  },
  methods: {
    activateSection(sectionId) {
      this.activeSectionId = sectionId;
    },
    scheduleSectionSync() {
      if (this.sectionScrollFrame !== null) return;

      this.sectionScrollFrame = window.requestAnimationFrame(() => {
        this.sectionScrollFrame = null;
        this.syncActiveSection();
      });
    },
    syncActiveSection() {
      const sections = this.page.sections
        .map(section => ({
          id: section.id,
          element: document.getElementById(section.id)
        }))
        .filter(section => section.element);

      if (!sections.length) return;

      const readingLine = Math.min(window.innerHeight * 0.34, 340);
      let currentSectionId = sections[0].id;

      sections.forEach(section => {
        if (section.element.getBoundingClientRect().top <= readingLine) {
          currentSectionId = section.id;
        }
      });

      this.activeSectionId = currentSectionId;
    }
  }
};
</script>

<style scoped>
.information-page {
  --information-ink: #111111;
  --information-muted: rgba(17, 17, 17, 0.60);
  --information-border: rgba(17, 17, 17, 0.12);
  --information-soft: #f5f4f1;
  gap: 0;
  padding-bottom: clamp(40px, 7vw, 96px);
}

.information-page :deep(.page-breadcrumbs) {
  margin: 8px 0 clamp(36px, 6vw, 84px);
}

.information-hero {
  display: grid;
  max-width: 920px;
  gap: 18px;
  padding-bottom: clamp(42px, 7vw, 88px);
}

.information-hero h1 {
  max-width: 860px;
  margin: 0;
  color: var(--information-ink);
  font-size: clamp(42px, 7.2vw, 108px);
  font-weight: 700;
  letter-spacing: -0.065em;
  line-height: 0.92;
  text-transform: uppercase;
}

.information-hero > p:last-child {
  max-width: 680px;
  margin: 0;
  color: var(--information-muted);
  font-size: clamp(16px, 1.5vw, 21px);
  line-height: 1.65;
}

.information-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--information-ink);
  border-bottom: 1px solid var(--information-border);
}

.information-fact {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 178px;
  padding: 28px clamp(18px, 2.6vw, 40px);
  border-right: 1px solid var(--information-border);
}

.information-fact:first-child {
  padding-left: 0;
}

.information-fact:last-child {
  border-right: 0;
}

.information-fact span,
.size-table-card__header span {
  color: var(--information-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.information-fact strong {
  font-size: clamp(20px, 2.1vw, 30px);
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.information-fact small {
  max-width: 270px;
  color: var(--information-muted);
  font-size: 13px;
  line-height: 1.55;
}

.information-layout {
  display: grid;
  grid-template-columns: minmax(160px, 0.27fr) minmax(0, 1fr);
  gap: clamp(44px, 8vw, 140px);
  padding-top: clamp(48px, 8vw, 110px);
}

.information-nav {
  position: sticky;
  top: calc(var(--store-header-height) + 28px);
  display: flex;
  flex-direction: column;
  align-self: start;
  gap: 12px;
}

.information-nav p {
  margin: 0 0 9px;
  color: var(--information-ink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.information-nav a {
  position: relative;
  width: fit-content;
  padding-left: 16px;
  color: var(--information-muted);
  font-size: 13px;
  line-height: 1.35;
  text-decoration: none;
  transition: color 180ms ease, font-weight 180ms ease, transform 180ms ease;
}

.information-nav a::before {
  position: absolute;
  top: 0.18em;
  bottom: 0.18em;
  left: 0;
  width: 2px;
  background: transparent;
  content: '';
  transition: background 180ms ease;
}

.information-nav a:hover {
  color: var(--information-ink);
}

.information-nav a.is-active {
  color: var(--information-ink);
  font-weight: 750;
  transform: translateX(4px);
}

.information-nav a.is-active::before {
  background: var(--information-ink);
}

.information-content {
  min-width: 0;
}

.information-section {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: clamp(18px, 3vw, 48px);
  padding: 0 0 clamp(52px, 8vw, 96px);
  scroll-margin-top: calc(var(--store-header-height) + 96px);
}

.information-section + .information-section {
  padding-top: clamp(52px, 7vw, 86px);
  border-top: 1px solid var(--information-border);
}

.information-section__number {
  padding-top: 8px;
  color: rgba(17, 17, 17, 0.34);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.information-section__body {
  display: grid;
  gap: 22px;
  min-width: 0;
}

.information-section h2,
.information-contact h2 {
  margin: 0;
  color: var(--information-ink);
  font-size: clamp(28px, 3.8vw, 54px);
  font-weight: 650;
  letter-spacing: -0.045em;
  line-height: 1;
}

.information-section__body > p {
  max-width: none;
  margin: 0;
  color: var(--information-muted);
  font-size: 16px;
  line-height: 1.8;
}

.information-section ul {
  display: grid;
  max-width: none;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.information-section ul li {
  position: relative;
  padding-left: 24px;
  color: var(--information-muted);
  font-size: 15px;
  line-height: 1.7;
}

.information-section ul li::before {
  position: absolute;
  top: 0.72em;
  left: 0;
  width: 7px;
  height: 7px;
  border: 1px solid var(--information-ink);
  border-radius: 50%;
  content: '';
}

.information-steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 8px 0 0;
  padding: 1px;
  background: var(--information-border);
  list-style: none;
}

.information-steps li {
  min-height: 170px;
  padding: 24px;
  background: #ffffff;
}

.information-steps span {
  color: var(--information-ink);
  font-size: 15px;
  font-weight: 700;
}

.information-steps p {
  margin: 12px 0 0;
  color: var(--information-muted);
  font-size: 14px;
  line-height: 1.65;
}

.information-note {
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  padding: 22px 24px;
  border-left: 2px solid var(--information-ink);
  background: var(--information-soft);
}

.information-note strong {
  font-size: 14px;
}

.information-note p {
  margin: 8px 0 0;
  color: var(--information-muted);
  font-size: 14px;
  line-height: 1.65;
}

.size-tables {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 18px;
  margin-top: 10px;
}

.size-tables--three .size-table-card:last-child {
  grid-column: 1 / -1;
}

.size-table-card {
  min-width: 0;
  border: 1px solid var(--information-border);
}

.size-table-card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border-bottom: 1px solid var(--information-border);
}

.size-table-card__header h3 {
  margin: 0;
  font-size: 19px;
}

.size-table-card__scroll {
  overflow-x: auto;
}

.size-table-card table {
  width: 100%;
  min-width: 390px;
  border-collapse: collapse;
  table-layout: fixed;
}

.size-table-card th,
.size-table-card td {
  padding: 13px 10px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.08);
  text-align: center;
}

.size-table-card th {
  color: var(--information-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.size-table-card td {
  color: var(--information-ink);
  font-size: 13px;
}

.size-table-card tbody tr:last-child td {
  border-bottom: 0;
}

.information-contact {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 36px;
  margin-top: clamp(10px, 3vw, 40px);
  padding: clamp(30px, 5vw, 56px);
  background: var(--information-ink);
  color: #ffffff;
}

.information-contact > div:first-child {
  display: grid;
  max-width: 630px;
  gap: 14px;
}

.information-contact .eyebrow,
.information-contact > div:first-child > p:last-child {
  color: rgba(255, 255, 255, 0.58);
}

.information-contact h2 {
  color: #ffffff;
}

.information-contact > div:first-child > p:last-child {
  margin: 0;
  line-height: 1.65;
}

.information-contact__links {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.information-contact__links a {
  color: #ffffff;
  font-size: 14px;
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.34);
}

.information-contact__links a:hover {
  border-bottom-color: #ffffff;
}

@media (max-width: 900px) {
  .information-facts {
    grid-template-columns: 1fr;
  }

  .information-fact,
  .information-fact:first-child {
    min-height: 0;
    padding: 22px 0;
    border-right: 0;
    border-bottom: 1px solid var(--information-border);
  }

  .information-fact:last-child {
    border-bottom: 0;
  }

  .information-layout {
    grid-template-columns: 1fr;
    gap: 56px;
  }

  .information-nav {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 20px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--information-border);
  }

  .information-nav p {
    grid-column: 1 / -1;
  }

  .size-tables {
    grid-template-columns: 1fr;
  }

  .information-contact {
    align-items: flex-start;
    flex-direction: column;
  }

  .information-contact__links {
    align-items: flex-start;
  }
}

@media (max-width: 560px) {
  .information-page :deep(.page-breadcrumbs) {
    margin-bottom: 28px;
  }

  .information-hero h1 {
    font-size: clamp(38px, 14vw, 64px);
  }

  .information-section {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .information-section__number {
    padding-top: 0;
  }

  .information-steps {
    grid-template-columns: 1fr;
  }

  .information-contact {
    margin-right: calc(var(--layout-gutter) * -1);
    margin-left: calc(var(--layout-gutter) * -1);
    padding: 32px var(--layout-gutter);
  }

  .information-contact__links a {
    font-size: 12px;
  }
}

@media (min-width: 1440px) {
  .information-page :deep(.page-breadcrumbs__link),
  .information-page :deep(.page-breadcrumbs__current) {
    font-size: 14px;
  }

  .information-hero {
    max-width: 1080px;
  }

  .information-hero .eyebrow {
    font-size: 14px !important;
  }

  .information-hero > p:last-child {
    max-width: 820px;
    font-size: clamp(20px, 1.25vw, 25px);
  }

  .information-fact {
    min-height: 210px;
    gap: 12px;
    padding-top: 36px;
    padding-bottom: 36px;
  }

  .information-fact span,
  .size-table-card__header span {
    font-size: 13px;
  }

  .information-fact strong {
    font-size: clamp(28px, 2vw, 38px);
  }

  .information-fact small {
    max-width: 330px;
    font-size: 16px;
  }

  .information-page--size-guide .information-layout {
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 48px;
  }

  .information-nav a {
    font-size: 18px;
    line-height: 1.5;
  }

  .information-nav {
    gap: 17px;
  }

  .information-nav p {
    margin-bottom: 11px;
    font-size: 14px;
  }

  .information-section {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 24px;
  }

  .information-page--size-guide .information-section {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 20px;
  }

  .information-section__number {
    font-size: 15px;
  }

  .information-section h2,
  .information-contact h2 {
    font-size: clamp(42px, 3.4vw, 64px);
  }

  .information-section__body > p {
    max-width: none;
    font-size: 20px;
  }

  .information-section ul {
    max-width: none;
  }

  .information-section ul li {
    padding-left: 30px;
    font-size: 18px;
  }

  .information-section ul li::before {
    width: 9px;
    height: 9px;
  }

  .information-steps li {
    min-height: 205px;
    padding: 32px;
  }

  .information-steps span {
    font-size: 19px;
  }

  .information-steps p,
  .information-note p {
    font-size: 17px;
  }

  .information-note {
    max-width: none;
    padding: 28px 30px;
  }

  .information-note strong {
    font-size: 17px;
  }

  .size-table-card__header {
    padding: 26px 28px;
  }

  .size-table-card__header h3 {
    font-size: 24px;
  }

  .size-table-card th {
    font-size: 12px;
  }

  .size-table-card td {
    padding: 17px 12px;
    font-size: 17px;
  }

  .information-contact {
    padding: clamp(48px, 5vw, 72px);
  }

  .information-contact > div:first-child {
    max-width: 760px;
  }

  .information-contact > div:first-child > p:last-child,
  .information-contact__links a {
    font-size: 17px;
  }
}

@media (min-width: 1700px) {
  .size-tables--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .size-tables--three .size-table-card:last-child {
    grid-column: auto;
  }

  .size-tables--three .size-table-card table {
    min-width: 0;
  }
}
</style>
