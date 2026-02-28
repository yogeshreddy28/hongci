(function () {
  "use strict";

  var INTERNAL_PAGE_OPTIONS = [
    "index.html",
    "philosophy.html",
    "mission.html",
    "events.html",
    "charity.html",
    "volunteer.html",
    "books.html",
    "transparency.html"
  ];

  function heroGroup(label) {
    return {
      title: label || "Hero",
      fields: [
        { key: "hero.label", label: "Section Label", type: "text", required: true },
        { key: "hero.title", label: "Title", type: "text", required: true },
        { key: "hero.subtitle", label: "Subtitle", type: "textarea", required: true },
        { key: "hero.intro", label: "Intro Paragraph", type: "textarea", required: true },
        { key: "hero.image", label: "Hero Image", type: "image" }
      ]
    };
  }

  function watermarkGroup() {
    return {
      title: "Brand Watermark",
      fields: [
        { key: "brand.sealImage", label: "Seal Image", type: "image" },
        { key: "brand.watermarkOpacity", label: "Watermark Opacity", type: "number" }
      ]
    };
  }

  function ctaRepeater(label, min, max) {
    return {
      key: "hero.ctas",
      label: label || "Buttons",
      itemLabel: "Button",
      min: min || 0,
      max: max || 8,
      itemSchema: {
        fields: [
          { key: "label", label: "Button Label", type: "text", required: true },
          { key: "href", label: "Button Link", type: "pageLink", required: true, options: INTERNAL_PAGE_OPTIONS },
          { key: "style", label: "Button Style", type: "select", options: ["primary", "secondary"], required: true }
        ]
      }
    };
  }

  function simpleItemsRepeater(key, label, itemLabel, extraFields) {
    return {
      key: key,
      label: label,
      itemLabel: itemLabel || "Item",
      min: 0,
      max: 30,
      itemSchema: {
        fields: [
          { key: "title", label: "Title", type: "text", required: true },
          { key: "text", label: "Text", type: "textarea", required: true }
        ].concat(extraFields || [])
      }
    };
  }

  var schemas = {
    home: {
      title: "Home",
      groups: [
        heroGroup("Hero"),
        {
          title: "Our 3 Pillars",
          fields: [
            { key: "sections.0.label", label: "Section Label (Community Foundations)", type: "text", required: true },
            { key: "sections.0.title", label: "Section Title (Our 3 Pillars)", type: "text", required: true }
          ]
        },
        {
          title: "Community Highlights",
          fields: [
            { key: "sections.1.label", label: "Section Label", type: "text", required: true },
            { key: "sections.1.title", label: "Section Title", type: "text", required: true },
            { key: "sections.1.left.title", label: "Left Column Title", type: "text", required: true },
            { key: "sections.1.left.text", label: "Left Column Text", type: "textarea", required: true },
            { key: "sections.1.right.title", label: "Right Column Title", type: "text", required: true },
            { key: "sections.1.right.text", label: "Right Column Text", type: "textarea", required: true }
          ]
        },
        {
          title: "Impact",
          fields: [
            { key: "sections.2.label", label: "Section Label", type: "text", required: true },
            { key: "sections.2.title", label: "Section Title", type: "text", required: true },
            { key: "impact.bloodUnits", label: "Units of Blood Collected", type: "number", required: true },
            { key: "impact.volunteers", label: "Volunteers Joined", type: "number", required: true },
            { key: "impact.books", label: "Books Distributed", type: "number", required: true },
            { key: "impact.families", label: "Families Supported", type: "number", required: true }
          ]
        },
        {
          title: "Upcoming Event Highlight",
          fields: [
            { key: "sections.3.label", label: "Section Label", type: "text", required: true },
            { key: "sections.3.title", label: "Section Title", type: "text", required: true },
            { key: "sections.3.featuredEventId", label: "Featured Event ID", type: "text" },
            { key: "event.title", label: "Event Title", type: "text", required: true },
            { key: "event.location", label: "Event Location", type: "text", required: true },
            { key: "event.registerUrl", label: "Register Link", type: "pageLink", required: true, options: INTERNAL_PAGE_OPTIONS }
          ]
        },
        watermarkGroup()
      ],
      repeaters: [
        ctaRepeater("Hero Buttons", 1, 6),
        {
          key: "sections.0.items",
          label: "Our 3 Pillars",
          itemLabel: "Pillar",
          min: 3,
          max: 6,
          itemSchema: {
            fields: [
              { key: "icon", label: "Icon (emoji)", type: "text" },
              { key: "title", label: "Pillar Title", type: "text", required: true },
              { key: "text", label: "Pillar Description", type: "textarea", required: true }
            ]
          }
        },
        {
          key: "sections.2.stats",
          label: "Impact Stat Cards",
          itemLabel: "Stat",
          min: 4,
          max: 8,
          itemSchema: {
            fields: [
              { key: "key", label: "Stat Key", type: "select", options: ["bloodUnits", "volunteers", "books", "families"], required: true },
              { key: "value", label: "Value", type: "number", required: true },
              { key: "label", label: "Visible Label", type: "text", required: true }
            ]
          }
        }
      ]
    },

    philosophy: {
      title: "Philosophy",
      groups: [heroGroup("Page Header"), watermarkGroup()],
      repeaters: [
        ctaRepeater("Header Buttons", 0, 3),
        {
          key: "sections.0.items",
          label: "Philosophy Sections",
          itemLabel: "Philosophy Section",
          min: 4,
          max: 10,
          itemSchema: {
            fields: [
              { key: "title", label: "Section Heading", type: "text", required: true },
              { key: "text", label: "Section Text", type: "textarea", required: true }
            ]
          }
        }
      ]
    },

    mission: {
      title: "Mission & Operations",
      groups: [
        heroGroup("Page Header"),
        {
          title: "Book Sourcing Method",
          fields: [
            { key: "sections.2.title", label: "Section Title", type: "text", required: true },
            { key: "sections.2.items.0.title", label: "Lead 1 (Books are sourced through:)", type: "text", required: true },
            { key: "sections.2.items.0.text", label: "Lead 1 Items (comma separated)", type: "textarea", required: true },
            { key: "sections.2.items.1.title", label: "Lead 2 (Priority is given to:)", type: "text", required: true },
            { key: "sections.2.items.1.text", label: "Lead 2 Items (comma separated)", type: "textarea", required: true },
            { key: "sections.2.note", label: "Closing Line", type: "textarea", required: true }
          ]
        },
        {
          title: "Transparency Statement",
          fields: [
            { key: "sections.4.title", label: "Section Title", type: "text", required: true },
            { key: "sections.4.items.0.text", label: "Statement Text", type: "textarea", required: true }
          ]
        },
        watermarkGroup()
      ],
      repeaters: [
        ctaRepeater("Header Buttons", 0, 3),
        simpleItemsRepeater("sections.0.items", "Annual Goals", "Goal"),
        simpleItemsRepeater("sections.1.items", "How Funds Are Used", "Use Area"),
        simpleItemsRepeater("sections.3.items", "Camp Organization Structure", "Team Block")
      ]
    },

    events: {
      title: "Upcoming Events",
      groups: [
        heroGroup("Page Header"),
        {
          title: "Featured Upcoming Event",
          fields: [
            { key: "sections.0.title", label: "Section Title", type: "text", required: true },
            { key: "sections.0.label", label: "Section Intro Line", type: "text", required: true },
            { key: "sections.0.featuredKicker", label: "Featured Event Type Label", type: "text", required: true },
            { key: "sections.0.ctaLabel", label: "Featured Register Button Label", type: "text", required: true }
          ]
        },
        {
          title: "Event Calendar",
          fields: [
            { key: "sections.1.title", label: "Section Title", type: "text", required: true },
            { key: "sections.1.label", label: "Section Intro Line", type: "text", required: true }
          ]
        },
        {
          title: "Blood Donation Registration Form",
          fields: [
            { key: "sections.2.title", label: "Form Section Title", type: "text", required: true },
            { key: "sections.2.items.0.title", label: "Submit Button Label", type: "text", required: true },
            { key: "sections.2.items.1.title", label: "Secondary Button Label", type: "text", required: true }
          ]
        },
        watermarkGroup()
      ],
      repeaters: [
        ctaRepeater("Header Buttons", 0, 4),
        {
          key: "sections.1.items",
          label: "Event Calendar Items",
          itemLabel: "Event",
          min: 1,
          max: 20,
          itemSchema: {
            fields: [
              { key: "title", label: "Event Title", type: "text", required: true },
              { key: "text", label: "Short Description", type: "textarea", required: true },
              { key: "href", label: "Register / Details Link", type: "pageLink", options: INTERNAL_PAGE_OPTIONS }
            ]
          }
        }
      ]
    },

    "charity-support": {
      title: "Charity Support",
      groups: [
        heroGroup("Page Header"),
        {
          title: "Where Donations Are Used",
          fields: [
            { key: "sections.0.title", label: "Section Title", type: "text", required: true },
            { key: "sections.0.note", label: "Allocation Note", type: "textarea", required: true }
          ]
        },
        {
          title: "Donation Methods",
          fields: [
            { key: "sections.1.title", label: "Section Title", type: "text", required: true },
            { key: "sections.1.upi.title", label: "UPI Block Title", type: "text", required: true },
            { key: "sections.1.upi.qrImage", label: "UPI QR Image", type: "image" },
            { key: "sections.1.upi.scanText", label: "UPI Scan Text", type: "text", required: true },
            { key: "sections.1.upi.upiLabel", label: "UPI Label", type: "text", required: true },
            { key: "sections.1.upi.upiId", label: "UPI ID", type: "text", required: true },
            { key: "sections.1.upi.helperText", label: "UPI Helper Text", type: "text", required: true },
            { key: "sections.1.bank.title", label: "Bank Block Title", type: "text", required: true }
          ]
        },
        {
          title: "Integrity Note",
          fields: [
            { key: "sections.2.title", label: "Section Title", type: "text", required: true },
            { key: "sections.2.items.0.text", label: "Integrity Statement", type: "textarea", required: true }
          ]
        },
        watermarkGroup()
      ],
      repeaters: [
        ctaRepeater("Header Buttons", 0, 4),
        simpleItemsRepeater("sections.0.items", "Where Donations Are Used", "Program"),
        {
          key: "sections.1.bank.fields",
          label: "Bank Transfer Rows",
          itemLabel: "Bank Field",
          min: 5,
          max: 10,
          itemSchema: {
            fields: [
              { key: "label", label: "Row Label", type: "text", required: true },
              { key: "value", label: "Row Value", type: "text", required: true }
            ]
          }
        }
      ]
    },

    volunteer: {
      title: "Volunteer",
      groups: [
        heroGroup("Page Header"),
        {
          title: "Volunteer Form",
          fields: [
            { key: "sections.1.title", label: "Form Section Title", type: "text", required: true },
            { key: "sections.1.fields.name.label", label: "Name Label", type: "text", required: true },
            { key: "sections.1.fields.name.placeholder", label: "Name Placeholder", type: "text" },
            { key: "sections.1.fields.whatsapp.label", label: "WhatsApp Label", type: "text", required: true },
            { key: "sections.1.fields.whatsapp.placeholder", label: "WhatsApp Placeholder", type: "text", required: true },
            { key: "sections.1.fields.skills.label", label: "Skills Label", type: "text", required: true },
            { key: "sections.1.fields.skills.placeholder", label: "Skills Placeholder", type: "textarea", required: true },
            { key: "sections.1.fields.availability.label", label: "Availability Label", type: "text", required: true },
            { key: "sections.1.fields.availability.placeholder", label: "Availability Placeholder", type: "textarea", required: true },
            { key: "sections.1.actions.primary.label", label: "Primary Button Label", type: "text", required: true },
            { key: "sections.1.actions.secondary.label", label: "Secondary Button Label", type: "text", required: true },
            { key: "sections.1.actions.secondary.href", label: "Secondary Button Link", type: "pageLink", options: INTERNAL_PAGE_OPTIONS, required: true },
            { key: "sections.1.note", label: "Form Note", type: "text", required: true },
            { key: "sections.1.groupInviteUrl", label: "WhatsApp Group Invite URL", type: "url", required: true }
          ]
        },
        watermarkGroup()
      ],
      repeaters: [
        ctaRepeater("Header Buttons", 0, 4),
        simpleItemsRepeater("sections.0.items", "Volunteer Roles", "Role")
      ]
    },

    "book-seva": {
      title: "Book Seva",
      groups: [heroGroup("Page Header"), watermarkGroup()],
      repeaters: [
        ctaRepeater("Header Buttons", 0, 4),
        {
          key: "sections.0.items",
          label: "Available Books",
          itemLabel: "Book Card",
          min: 1,
          max: 20,
          itemSchema: {
            fields: [
              { key: "title", label: "Book Title", type: "text", required: true },
              { key: "text", label: "Book Description", type: "textarea", required: true },
              { key: "href", label: "Request Link", type: "pageLink", options: INTERNAL_PAGE_OPTIONS }
            ]
          }
        }
      ]
    },

    transparency: {
      title: "Transparency",
      groups: [heroGroup("Page Header"), watermarkGroup()],
      repeaters: [
        ctaRepeater("Header Buttons", 0, 3),
        simpleItemsRepeater("sections.0.items", "Visible Transparency Notes", "Note")
      ]
    }
  };

  window.PageSchemas = {
    internalPageOptions: INTERNAL_PAGE_OPTIONS,
    schemas: schemas
  };
})();
