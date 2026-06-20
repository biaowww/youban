/* @ds-bundle: {"format":3,"namespace":"OffcircleDesignSystem_754ff1","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Eyebrow","sourcePath":"components/core/SectionHeading.jsx"},{"name":"SectionHeading","sourcePath":"components/core/SectionHeading.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"HeroCard","sourcePath":"components/game/HeroCard.jsx"},{"name":"NavBar","sourcePath":"components/navigation/NavBar.jsx"},{"name":"JobCard","sourcePath":"components/site/JobCard.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"29cccce22b46","components/core/Button.jsx":"5be278031944","components/core/Card.jsx":"9e6f459fc82c","components/core/Input.jsx":"b716082ceb88","components/core/SectionHeading.jsx":"c9b58a0d8b72","components/core/Tag.jsx":"1809d700f572","components/game/HeroCard.jsx":"0eae20a4ff7e","components/navigation/NavBar.jsx":"df10d97e8be1","components/site/JobCard.jsx":"d27336c61a0b","ui_kits/website/CareersView.jsx":"b35ee38ac149","ui_kits/website/HomeView.jsx":"4020c48fc18e","ui_kits/website/Shared.jsx":"97b236b65cf3"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OffcircleDesignSystem_754ff1 = window.OffcircleDesignSystem_754ff1 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small status / category marker.
 * Tones map to the brand palette; default is a quiet bone outline.
 */
function Badge({
  children,
  tone = 'neutral',
  solid = false,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      fg: 'var(--bone-300)',
      bd: 'var(--border-strong)',
      bg: 'var(--surface-fill)'
    },
    gold: {
      fg: 'var(--gold-300)',
      bd: 'var(--gold-600)',
      bg: 'rgba(196,163,90,0.10)'
    },
    jade: {
      fg: 'var(--jade-300)',
      bd: 'var(--jade-600)',
      bg: 'rgba(74,129,105,0.12)'
    },
    danger: {
      fg: '#E29A8F',
      bd: 'rgba(194,90,74,0.5)',
      bg: 'rgba(194,90,74,0.12)'
    }
  };
  const t = tones[tone] || tones.neutral;
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-overline)',
    fontWeight: 600,
    letterSpacing: 'var(--ls-wide)',
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    lineHeight: 1.3,
    color: solid ? 'var(--ink-900)' : t.fg,
    borderColor: solid ? 'transparent' : t.bd,
    background: solid ? t.fg : t.bg
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...base,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Off-Circle Button — the brand's primary action primitive.
 * Variants echo the live site: outlined "Learn More" CTA, gold-edge
 * submit, and quiet ghost links. Sharp corners, calm hover, gold glow.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  icon,
  iconRight,
  disabled = false,
  glow = false,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '8px 18px',
      fontSize: '13px'
    },
    md: {
      padding: '12px 30px',
      fontSize: '14px'
    },
    lg: {
      padding: '15px 40px',
      fontSize: '15px'
    }
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    letterSpacing: '0.02em',
    lineHeight: 1,
    borderRadius: 'var(--radius-sm)',
    border: '2px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    boxShadow: glow ? 'var(--glow-gold-md)' : 'none',
    ...sizes[size]
  };
  const variants = {
    // Solid gold — highest emphasis (use once per view)
    primary: {
      background: 'var(--gold-500)',
      color: 'var(--ink-900)',
      borderColor: 'var(--gold-500)'
    },
    // Outlined bone — the site's "Learn More" hero CTA
    secondary: {
      background: 'transparent',
      color: 'var(--bone-100)',
      borderColor: 'var(--border-strong)'
    },
    // Gold-edge submit — quiet until hover
    gold: {
      background: 'transparent',
      color: 'var(--bone-100)',
      borderColor: 'var(--gold-400)'
    },
    // Text-only
    ghost: {
      background: 'transparent',
      color: 'var(--bone-300)',
      borderColor: 'transparent',
      padding: '8px 6px'
    }
  };
  const hoverHandlers = disabled ? {} : {
    onMouseEnter: e => {
      const el = e.currentTarget;
      if (variant === 'primary') {
        el.style.background = 'var(--gold-300)';
        el.style.borderColor = 'var(--gold-300)';
      } else if (variant === 'secondary') {
        el.style.borderColor = 'var(--gold-500)';
        el.style.color = 'var(--gold-500)';
      } else if (variant === 'gold') {
        el.style.borderColor = 'var(--gold-300)';
        el.style.color = 'var(--gold-300)';
      } else {
        el.style.color = 'var(--gold-500)';
      }
    },
    onMouseLeave: e => {
      const el = e.currentTarget;
      Object.assign(el.style, variants[variant]);
      el.style.boxShadow = glow ? 'var(--glow-gold-md)' : 'none';
    }
  };
  const Tag = href ? 'a' : 'button';
  const tagProps = href ? {
    href
  } : {
    type,
    disabled
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({}, tagProps, {
    onClick: disabled ? undefined : onClick,
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, hoverHandlers, rest), icon, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — the brand's surface container. Hairline border, near-flat
 * fill, gold border on active/hover. Optional cover image with scrim.
 */
function Card({
  children,
  image,
  interactive = false,
  active = false,
  accent = 'gold',
  padding = 'var(--space-6)',
  style,
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const accentColor = accent === 'jade' ? 'var(--jade-500)' : 'var(--gold-500)';
  const base = {
    position: 'relative',
    background: active || interactive && hover ? 'var(--surface-fill-hover)' : 'var(--surface-fill)',
    border: '1px solid',
    borderColor: active ? accentColor : interactive && hover ? 'var(--border-strong)' : 'var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    overflow: 'hidden',
    cursor: interactive ? 'pointer' : 'default',
    transition: 'border-color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
    transform: interactive && hover ? 'translateY(-2px)' : 'none'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      ...base,
      ...style
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: onClick
  }, rest), image && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '16 / 10',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
      transform: hover && interactive ? 'scale(1.04)' : 'scale(1)',
      transition: 'transform var(--dur-slow) var(--ease-out)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim-bottom)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Off-Circle text input — flat, dark, gold focus underline.
 * Matches the site's email field but tokenised and accessible.
 */
function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
  hint,
  disabled = false,
  invalid = false,
  icon,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const wrap = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontFamily: 'var(--font-sans)',
    width: '100%'
  };
  const field = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: focused ? 'var(--ink-600)' : 'var(--ink-700)',
    border: '1px solid',
    borderColor: invalid ? 'var(--status-danger)' : focused ? 'var(--gold-400)' : 'var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    padding: '0 14px',
    transition: 'border-color var(--dur-fast), background var(--dur-fast)',
    opacity: disabled ? 0.5 : 1,
    boxShadow: focused ? 'var(--glow-gold-sm)' : 'none'
  };
  const input = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--bone-100)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-body-sm)',
    padding: '13px 0',
    width: '100%'
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      ...wrap,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-overline)',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase',
      color: 'var(--bone-400)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: field
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--bone-400)',
      display: 'flex'
    }
  }, icon), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: input
  }, rest))), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-caption)',
      color: invalid ? 'var(--status-danger)' : 'var(--bone-500)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Eyebrow — spaced-caps overline that sits above headings. */
function Eyebrow({
  children,
  tone = 'gold',
  style,
  ...rest
}) {
  const color = tone === 'muted' ? 'var(--bone-400)' : tone === 'jade' ? 'var(--jade-400)' : 'var(--gold-500)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-overline)',
      fontWeight: 600,
      letterSpacing: 'var(--ls-widest)',
      textTransform: 'uppercase',
      color,
      ...style
    }
  }, rest), children);
}

/**
 * SectionHeading — eyebrow + serif title + optional lede, the brand's
 * canonical section opener (centred or left-aligned).
 */
function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'center',
  size = 'md',
  style,
  ...rest
}) {
  const titleSize = size === 'lg' ? 'var(--fs-display-lg)' : size === 'sm' ? 'var(--fs-display-sm)' : 'var(--fs-display-md)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      textAlign: align,
      maxWidth: align === 'center' ? 'var(--container-md)' : 'none',
      margin: align === 'center' ? '0 auto' : '0',
      ...style
    }
  }, rest), eyebrow && /*#__PURE__*/React.createElement(Eyebrow, null, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      color: 'var(--text-heading)',
      fontWeight: 700,
      fontSize: titleSize,
      letterSpacing: 'var(--ls-tight)',
      lineHeight: 1.15,
      margin: 0
    }
  }, title), lede && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      color: 'var(--bone-300)',
      fontSize: 'var(--fs-body)',
      lineHeight: 'var(--lh-body)',
      margin: 0,
      maxWidth: '60ch'
    }
  }, lede));
}
Object.assign(__ds_scope, { Eyebrow, SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — game-flavored data chip (cost, element, role). Mono numerals.
 * Use for auto-chess stats and lore taxonomy; quieter than a Button.
 */
function Tag({
  children,
  icon,
  tone = 'neutral',
  style,
  ...rest
}) {
  const tones = {
    neutral: 'var(--bone-200)',
    gold: 'var(--gold-300)',
    jade: 'var(--jade-300)',
    mist: 'var(--mist-300)'
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-caption)',
    fontVariantNumeric: 'tabular-nums',
    color: tones[tone] || tones.neutral,
    background: 'var(--surface-fill)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    padding: '4px 8px',
    lineHeight: 1.2
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...base,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex'
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/game/HeroCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * HeroCard — auto-chess unit tile for Project Breach. Portrait with
 * scrim, cost chip, star tier, role and ATK/HP. Gold rarity edge.
 */
function HeroCard({
  name,
  title,
  portrait,
  cost = 3,
  stars = 2,
  role = 'Vanguard',
  atk = 240,
  hp = 1800,
  rarity = 'gold',
  selected = false,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const edge = rarity === 'jade' ? 'var(--jade-500)' : rarity === 'mist' ? 'var(--mist-500)' : 'var(--gold-500)';
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      width: '200px',
      background: 'var(--surface-1)',
      border: '1px solid',
      borderColor: selected ? edge : hover ? 'var(--border-strong)' : 'var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      cursor: 'pointer',
      boxShadow: selected ? 'var(--glow-gold-sm)' : 'none',
      transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base), transform var(--dur-base) var(--ease-out)',
      transform: hover ? 'translateY(-3px)' : 'none',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '3 / 4',
      overflow: 'hidden'
    }
  }, portrait ? /*#__PURE__*/React.createElement("img", {
    src: portrait,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: hover ? 'scale(1.05)' : 'scale(1)',
      transition: 'transform var(--dur-slow) var(--ease-out)'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(160deg,var(--ink-600),var(--ink-850))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim-bottom)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '8px',
      left: '8px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "gold",
    icon: "\u25C8"
  }, cost)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      display: 'flex',
      gap: '1px',
      color: 'var(--gold-300)',
      fontSize: '12px',
      textShadow: '0 1px 3px rgba(0,0,0,0.8)'
    }
  }, '★'.repeat(stars)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '12px',
      right: '12px',
      bottom: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      color: '#fff',
      fontSize: '20px',
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: '0.01em'
    }
  }, name), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      color: 'var(--bone-300)',
      fontSize: '11px',
      letterSpacing: '0.06em'
    }
  }, title))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: rarity === 'jade' ? 'jade' : 'neutral'
  }, role), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#E29A8F'
    }
  }, atk), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--jade-300)'
    }
  }, hp.toLocaleString()))));
}
Object.assign(__ds_scope, { HeroCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/game/HeroCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NavBar — the site's top navigation. Glassy ink bar, logo mark left,
 * links + language toggle right. Active link in gold.
 */
function NavBar({
  logoSrc = 'assets/logo-mark.png',
  links = [{
    label: '首页',
    href: '#',
    active: true
  }, {
    label: '游戏',
    href: '#'
  }, {
    label: '招聘',
    href: '#'
  }],
  lang = '中文',
  onLangToggle,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      position: 'relative',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--gutter)',
      height: 'var(--nav-height)',
      background: 'var(--surface-glass)',
      backdropFilter: 'var(--blur-sm)',
      WebkitBackdropFilter: 'var(--blur-sm)',
      borderBottom: '1px solid var(--border-hairline)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "OFF-CIRCLE",
    style: {
      height: '40px',
      width: 'auto',
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-8)',
      marginLeft: 'auto'
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement(NavLink, _extends({
    key: i
  }, l))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onLangToggle,
    style: {
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      padding: '6px 14px',
      fontSize: 'var(--fs-caption)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--bone-300)',
      background: 'transparent',
      cursor: 'pointer',
      transition: 'border-color var(--dur-fast), color var(--dur-fast)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = 'var(--gold-500)';
      e.currentTarget.style.color = 'var(--gold-500)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = 'var(--border-strong)';
      e.currentTarget.style.color = 'var(--bone-300)';
    }
  }, "\u2699 ", lang)));
}
function NavLink({
  label,
  href = '#',
  active = false,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-caption)',
      color: active || hover ? 'var(--gold-500)' : 'var(--bone-300)',
      textDecoration: 'none',
      transition: 'color var(--dur-fast)'
    }
  }, label);
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/site/JobCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * JobCard — expandable careers listing, recreated from careers.html.
 * Category overline, title, location, gold-edged requirements block.
 */
function JobCard({
  category,
  title,
  location = '成都',
  description,
  requirements,
  contactEmail = 'careers@offcircle-studios.com',
  defaultExpanded = false,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(defaultExpanded);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      border: '1px solid',
      borderColor: open ? 'var(--gold-500)' : 'var(--border-subtle)',
      background: open ? 'rgba(255,255,255,0.05)' : 'var(--surface-fill)',
      borderRadius: 'var(--radius-xs)',
      padding: '20px 24px',
      cursor: 'pointer',
      transition: 'border-color var(--dur-base), background var(--dur-base)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(v => !v),
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-overline)',
      color: 'var(--bone-400)',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase',
      marginBottom: '4px'
    }
  }, category), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--bone-100)',
      marginBottom: '12px'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-caption)',
      color: 'var(--bone-300)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--gold-500)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  })), location)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--bone-400)',
      fontSize: '14px',
      transition: 'transform var(--dur-base)',
      transform: open ? 'rotate(180deg)' : 'none'
    }
  }, "\u25BC")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid var(--border-hairline)'
    }
  }, description && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-caption)',
      lineHeight: 'var(--lh-relaxed)',
      color: 'var(--bone-300)',
      margin: '0 0 16px'
    }
  }, description), requirements && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
      lineHeight: 'var(--lh-relaxed)',
      color: 'var(--bone-400)',
      background: 'var(--surface-fill)',
      padding: '12px 16px',
      borderLeft: '2px solid var(--gold-500)',
      whiteSpace: 'pre-line',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--gold-500)'
    }
  }, "\u5C97\u4F4D\u8981\u6C42\uFF1A"), '\n', requirements), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
      color: 'var(--bone-400)'
    }
  }, "\u6709\u5174\u8DA3\uFF1F\u53D1\u9001\u7B80\u5386\u81F3 ", /*#__PURE__*/React.createElement("a", {
    href: `mailto:${contactEmail}`,
    style: {
      color: 'var(--gold-500)'
    }
  }, contactEmail))));
}
Object.assign(__ds_scope, { JobCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/site/JobCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/CareersView.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Careers view — jobs list, recreated from careers.html.
(() => {
  const {
    JobCard
  } = window.OffcircleDesignSystem_754ff1;
  const OC_JOBS = [{
    category: 'Program Engineer / 程序工程',
    title: '游戏开发实习生（引擎不限）',
    location: '成都',
    description: '我们正在寻找富有创意和热情的游戏开发实习生加入我们的团队。您将有机会参与真实项目的开发，学习业界最新的游戏开发技术和工作流程。',
    requirements: '• 熟悉 C++、C# 或 Python 等一种或多种编程语言\n• 了解游戏引擎（如 Unity、Unreal Engine）\n• 对游戏开发充满热情\n• 团队协作能力强\n• 英文交流能力良好'
  }, {
    category: 'Program Engineer / 程序工程',
    title: '服务器开发工程师',
    location: '成都',
    description: '我们需要经验丰富的服务器开发工程师来构建和维护我们的游戏后端系统。',
    requirements: '• 5 年以上服务器开发经验\n• 精通 C++ 或 Go\n• 了解分布式系统\n• 有游戏服务器经验优先'
  }, {
    category: 'Art / 美术',
    title: '3D 模型师',
    location: '成都',
    description: '加入我们的美术团队，为游戏角色和场景创作高质量的 3D 模型。',
    requirements: '• 精通 Maya 或 Blender\n• 了解游戏引擎的美术流程\n• 有完整的作品集\n• 对游戏美术有深刻理解'
  }, {
    category: 'Design / 设计',
    title: '游戏策划',
    location: '成都',
    description: '我们需要创意策划人员来设计有趣且平衡的游戏机制和玩法。',
    requirements: '• 2 年以上游戏策划经验\n• 了解游戏设计文档编写\n• 有成功发行作品经验\n• 数据分析能力'
  }, {
    category: 'Design / 设计',
    title: 'UI/UX 设计师',
    location: '成都',
    description: '负责游戏界面及交互体验的设计，为玩家打造直观、美观且沉浸式的操作体验。',
    requirements: '• 3 年以上 UI/UX 设计经验\n• 精通 Figma 或 Sketch\n• 了解游戏 HUD 及菜单系统设计\n• 有游戏或互动产品设计经验优先'
  }];
  function CareersView() {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        minHeight: '420px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundImage: "url('../../assets/concept-hero-2.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--scrim-radial)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        zIndex: 10,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--fs-display-xl)',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: 'var(--ls-tightest)',
        margin: '0 0 16px',
        textShadow: '0 4px 30px rgba(0,0,0,0.5)'
      }
    }, "Work With Us"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: '15px',
        color: 'rgba(255,255,255,0.78)',
        maxWidth: '500px',
        lineHeight: 1.6,
        margin: 0
      }
    }, "\u52A0\u5165\u8D85\u5143\u5DE5\u4F5C\u5BA4\uFF0C\u4E0E\u6211\u4EEC\u4E00\u8D77\u521B\u9020\u72EC\u7279\u7684\u6E38\u620F\u4F53\u9A8C\u3002\u6211\u4EEC\u5BFB\u627E\u5145\u6EE1\u521B\u610F\u548C\u70ED\u60C5\u7684\u4EBA\u624D\u3002"))), /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--ink-900)',
        padding: '72px var(--gutter)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 'var(--container-lg)',
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }
    }, OC_JOBS.map((job, i) => /*#__PURE__*/React.createElement(JobCard, _extends({
      key: i
    }, job, {
      contactEmail: "careers@offcircle-studios.com",
      defaultExpanded: i === 0
    })))))));
  }
  Object.assign(window, {
    CareersView
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/CareersView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomeView.jsx
try { (() => {
// Home view — hero carousel + about, recreated from index.html.
(() => {
  const {
    Button,
    SectionHeading
  } = window.OffcircleDesignSystem_754ff1;
  function HomeView() {
    const slides = ['../../assets/concept-hero-1.jpg', '../../assets/concept-hero-2.jpg'];
    const [slide, setSlide] = React.useState(0);
    React.useEffect(() => {
      const id = setInterval(() => setSlide(s => (s + 1) % slides.length), 5000);
      return () => clearInterval(id);
    }, []);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        minHeight: '660px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }
    }, slides.map((src, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'absolute',
        inset: 0,
        backgroundImage: `url('${src}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: i === slide ? 1 : 0,
        transition: 'opacity var(--dur-slow) ease-in-out'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--scrim-radial)',
        zIndex: 5
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo-center.png",
      alt: "OFF-CIRCLE",
      style: {
        width: '116px',
        height: '116px',
        objectFit: 'contain',
        marginBottom: '8px',
        filter: 'drop-shadow(var(--glow-gold-sm))'
      }
    }), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--fs-display-xl)',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: 'var(--ls-tightest)',
        lineHeight: 1.15,
        margin: 0,
        textShadow: '0 4px 30px rgba(0,0,0,0.5)'
      }
    }, "\u7A7A\u88C2\uFF1A\u6E90\u8D77"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: '15px',
        color: 'rgba(255,255,255,0.82)',
        maxWidth: '520px',
        lineHeight: 1.6,
        margin: '0 0 12px'
      }
    }, "\u4E00\u6B3E\u96C6\u5FEB\u8282\u594F\u52A8\u4F5C\u3001\u6218\u672F\u7B56\u7565\u548C\u53D9\u4E8B\u6DF1\u5EA6\u4E8E\u4E00\u8EAB\u7684\u72EC\u7279\u6E38\u620F\u4F53\u9A8C\uFF0C\u9762\u5411\u5168\u7403\u73A9\u5BB6\u63D0\u4F9B\u5168\u65B0\u7684\u6E38\u620F\u5185\u5BB9\u548C\u521B\u65B0\u73A9\u6CD5\u3002"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg"
    }, "Learn More")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 15,
        display: 'flex',
        gap: '12px'
      }
    }, slides.map((_, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      onClick: () => setSlide(i),
      "aria-label": `Slide ${i + 1}`,
      style: {
        width: i === slide ? '24px' : '8px',
        height: '8px',
        borderRadius: '4px',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        background: i === slide ? 'var(--gold-500)' : 'rgba(255,255,255,0.3)',
        transition: 'all var(--dur-base)'
      }
    })))), /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        padding: '80px var(--gutter)',
        textAlign: 'center',
        overflow: 'hidden',
        backgroundImage: "url('../../assets/concept-about.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--scrim-flat)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        zIndex: 2,
        maxWidth: 'var(--container-md)',
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "About Us",
      title: "\u5173\u4E8E\u6211\u4EEC"
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: '15px',
        lineHeight: 1.8,
        color: 'var(--bone-300)',
        margin: '24px 0 16px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--gold-500)',
        fontWeight: 500
      }
    }, "OFF-CIRCLE STUDIO"), " \u8D85\u5143\u5DE5\u4F5C\u5BA4\u662F\u4E00\u5BB6\u6210\u90FD\u7684\u72EC\u7ACB\u521B\u65B0\u6E38\u620F\u5DE5\u4F5C\u5BA4\u3002\u6211\u4EEC\u81F4\u529B\u4E8E\u6253\u9020\u9AD8\u8D28\u91CF\u3001\u5BCC\u6709\u521B\u610F\u7684\u6E38\u620F\u4F53\u9A8C\uFF0C\u878D\u5408\u827A\u672F\u3001\u6545\u4E8B\u4E0E\u6280\u672F\uFF0C\u4E3A\u73A9\u5BB6\u5448\u73B0\u72EC\u4E00\u65E0\u4E8C\u7684\u6E38\u620F\u4E16\u754C\u3002"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: '15px',
        lineHeight: 1.8,
        color: 'var(--bone-300)',
        margin: 0
      }
    }, "\u6211\u4EEC\u76F8\u4FE1\uFF0C\u6E38\u620F\u4E0D\u4EC5\u662F\u5A31\u4E50\uFF0C\u66F4\u662F\u4E00\u79CD\u827A\u672F\u8868\u8FBE\u548C\u6587\u5316\u4F20\u627F\u3002\u901A\u8FC7\u521B\u610F\u56E2\u961F\u7684\u52AA\u529B\uFF0C\u6211\u4EEC\u521B\u9020\u51FA\u80FD\u591F\u89E6\u52A8\u73A9\u5BB6\u5FC3\u7075\u3001\u6FC0\u53D1\u5176\u6E38\u620F\u70ED\u60C5\u7684\u4F5C\u54C1\u3002"))));
  }
  Object.assign(window, {
    HomeView
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomeView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Shared.jsx
try { (() => {
// Shared footer + contact section for the Off-Circle site UI kit.
(() => {
  const {
    Button,
    Input,
    SectionHeading
  } = window.OffcircleDesignSystem_754ff1;
  function ContactSection({
    heading = '联系我们',
    email = 'inquiry@offcircle-studios.com',
    subtitle = '订阅我们的邮件列表，了解最新的游戏资讯、开发进度和独家活动信息。加入我们的社区，成为游戏世界的一部分。'
  }) {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--grad-deepen)',
        padding: '80px var(--gutter)',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 'var(--container-sm)',
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      title: heading,
      lede: subtitle
    }), /*#__PURE__*/React.createElement("form", {
      onSubmit: e => {
        e.preventDefault();
        alert('感谢订阅!');
      },
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '460px',
        margin: '28px auto 24px'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      type: "email",
      placeholder: "Email address",
      required: true
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "gold",
      type: "submit"
    }, "sign up")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--fs-caption)',
        marginBottom: '20px'
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: `mailto:${email}`,
      style: {
        color: 'var(--gold-500)'
      }
    }, email)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: '24px'
      }
    }, /*#__PURE__*/React.createElement(SocialIcon, {
      src: "../../assets/icon-wechat.png",
      label: "WeChat"
    }), /*#__PURE__*/React.createElement(SocialIcon, {
      src: "../../assets/icon-linkedin.png",
      label: "LinkedIn"
    }))));
  }
  function SocialIcon({
    src,
    label
  }) {
    const [hover, setHover] = React.useState(false);
    return /*#__PURE__*/React.createElement("a", {
      href: "#",
      title: label,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hover ? 'var(--gold-300)' : 'var(--surface-fill)',
        border: '1px solid var(--border-subtle)',
        transition: 'background var(--dur-fast)'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: label,
      style: {
        width: '60%',
        height: '60%',
        objectFit: 'contain'
      }
    }));
  }
  function SiteFooter() {
    return /*#__PURE__*/React.createElement("footer", {
      style: {
        background: 'var(--ink-900)',
        borderTop: '1px solid var(--border-hairline)',
        padding: '24px var(--gutter)',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-caption)',
        color: 'var(--bone-500)'
      }
    }, "\xA9 2025 \u8D85\u5143\u5DE5\u4F5C\u5BA4 \u7248\u6743\u6240\u6709");
  }
  Object.assign(window, {
    ContactSection,
    SiteFooter
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Shared.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.HeroCard = __ds_scope.HeroCard;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.JobCard = __ds_scope.JobCard;

})();
