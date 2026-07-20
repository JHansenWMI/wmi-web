/**
 * Single source of truth for site navigation.
 * Edit menus here — site-chrome.js renders header, mobile nav, and footer.
 *
 * href: clean .html paths (or external URL)
 * children: optional dropdown items
 * external: open in new tab
 */
window.WMI_NAV = {
  siteName: "World Ministries International",
  home: "index.html",
  logo: "assets/images/logo.svg",

  /** Secondary / top utility nav (right of logo, above main) */
  top: [
    {
      label: "About",
      href: "about.html",
      children: [
        // Live About sub-nav: wmi-orientation-2.aspx (same label, different URL than Warning TV)
        { label: "WMI Orientation", href: "wmi-orientation-2.html" },
        { label: "Dr. Hansen's Bio", href: "dr-hansens-bio.html" },
        { label: "What Is A Prophet", href: "what-is-a-prophet.html" },
        { label: "Statement Of Faith", href: "statement-of-faith.html" },
        { label: "Standards of Conduct", href: "standards-of-conduct.html" },
        { label: "Testimonials", href: "testimonials.html" },
      ],
    },
    { label: "Benevolence", href: "benevolence.html" },
    { label: "The Dorcas Fund", href: "the-dorcas-fund.html" },
    { label: "Bible College", href: "bible-college.html" },
    { label: "Prayer", href: "prayer.html" },
    {
      label: "Contact",
      href: "contact.html",
      children: [
        // Live: L2 Prayer with L3 nested (ul3 panel under selected Prayer)
        {
          label: "Prayer",
          href: "prayer.html",
          children: [
            {
              label: "Prayer Requests to Gate Breakers",
              href: "prayer-requests.html",
            },
            {
              label: "Soldiers of the Cross Info",
              href: "intercessors.html",
            },
            {
              label: "Soldiers of the Cross Form",
              href: "intercessor-application.html",
            },
          ],
        },
      ],
    },
    { label: "Donate", href: "donate.html", donate: true },
  ],

  /** Primary main nav */
  main: [
    {
      label: "Warning TV, Radio & Social Media",
      href: "watch-warning.html",
      children: [
        // Live Warning TV sub-nav: wmi-orientation.aspx (not -2)
        { label: "WMI Orientation", href: "wmi-orientation.html" },
        { label: "Warning Social Media Video", href: "watch-warning.html" },
        { label: "The Overcoming Women TV", href: "the-overcoming-women.html" },
        { label: "Warning TV Broadcasts", href: "tv-broadcasts.html" },
        { label: "TV Channels", href: "tv-channels.html" },
        { label: "TV Guests", href: "tv-guests.html" },
        { label: "Warning Social Media Audio", href: "listen-to-warning.html" },
        { label: "Warning Radio Broadcast", href: "radio-broadcasts.html" },
        { label: "Shortwave Broadcasts", href: "shortwave-broadcasts.html" },
        { label: "Radio Channels", href: "radio-stations.html" },
        { label: "Radio Guests", href: "radio-guests.html" },
      ],
    },
    { label: "Prophecies", href: "prophecies.html" },
    { label: "Missions", href: "missions.html" },
    {
      label: "Eagles Saving Nations",
      href: "eagles-saving-nations.html",
      children: [
        { label: "Vision Statement", href: "eagles-saving-nations-vision.html" },
        { label: "Mission Statement", href: "eagles-saving-nations-mission.html" },
        { label: "ESN Statement of Faith", href: "esn-statement-of-faith.html" },
        { label: "Giving/Donations", href: "eagles-saving-nations.html" },
        { label: "Attributes of an Eagle", href: "attributes-of-eagles.html" },
      ],
    },
    {
      label: "Reading",
      href: "reading.html",
      children: [
        { label: "Pastoral Articles", href: "pastoral-articles.html" },
        { label: "Soldiers of the Cross Articles", href: "soldiers-of-the-cross.html" },
        { label: "Dr. Hansen's Thought For The Day", href: "thought-for-the-day.html" },
        {
          label: "Prophecies",
          href: "prophecies.html",
          children: [
            // Live: all-prophecies.aspx?cat=544 under Reading → Prophecies
            { label: "Prophecy - USA", href: "prophecies.html" },
          ],
        },
        { label: "The Dorcas Fund Articles", href: "the-dorcas-fund-articles.html" },
      ],
    },
    {
      label: "Events",
      href: "events.html",
      children: [
        { label: "United States Itinerary", href: "united-states-itinerary.html" },
        { label: "International Itinerary", href: "international-itinerary.html" },
      ],
    },
    {
      label: "Store",
      href: "https://www.store-worldministries.org",
      external: true,
    },
  ],

  /** Footer link column (subset of utility links) */
  footer: [
    { label: "About", href: "about.html" },
    { label: "Benevolence", href: "benevolence.html" },
    { label: "The Dorcas Fund", href: "the-dorcas-fund.html" },
    { label: "Bible College", href: "bible-college.html" },
    { label: "Prayer", href: "prayer.html" },
    { label: "Contact", href: "contact.html" },
    { label: "Donate", href: "donate.html" },
  ],

  contact: {
    addressLines: ["P.O. Box 277", "Stanwood, WA 98292"],
    phone: "360.629.5248",
    phoneHref: "tel:3606295248",
    fax: "360.629.6750 (Fax)",
  },

  social: [
    {
      label: "Facebook",
      href: "https://www.facebook.com/DrHansenWMI/",
      icon: "fab fa-facebook-f",
    },
    {
      label: "YouTube",
      href: "https://www.youtube.com/channel/UCuyR_14Lfh90qYJUafAWJmA",
      icon: "fab fa-youtube",
    },
    {
      label: "Rumble",
      href: "https://rumble.com/c/WarningTVJonathanHansen",
      icon: "rumble",
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/drjonathanhansen",
      icon: "fab fa-linkedin-in",
    },
  ],
};
