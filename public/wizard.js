/**
 * ct-decision-tree — front-end wizard
 *
 * Mounts into every <div class="ct-wizard" data-module-id="..."> on the page.
 * Fetches the tree JSON from /wp-json/ct/v1/tree/{module_id} once, stores it
 * in memory, and drives a step-by-step UI without further network requests.
 *
 * CSS class reference (all prefixed ct-wizard__ — override in Bricks/child theme):
 *   .ct-wizard              wrapper div (output by shortcode)
 *   .ct-wizard__trail       breadcrumb trail of visited step titles
 *   .ct-wizard__crumb       individual breadcrumb item
 *   .ct-wizard__heading     step title (<h3>)
 *   .ct-wizard__question    the yes/no question prompt (<p>)
 *   .ct-wizard__choices     button group wrapper
 *   .ct-wizard__choice      individual Yes/No button
 *   .ct-wizard__content     terminal node body copy
 *   .ct-wizard__callout     best practice callout block
 *   .ct-wizard__legislation legislation links block
 *   .ct-wizard__nav         back + restart button row
 *   .ct-wizard__back        back button
 *   .ct-wizard__restart     restart button
 *   .ct-wizard__error       error message
 *   .ct-wizard--loading     added to wrapper while fetching
 */

(function () {
  'use strict';

  function initWizard(container) {
    var moduleId = container.dataset.moduleId;
    if (!moduleId) return;

    var restUrl = (window.ctDTWizard && window.ctDTWizard.restUrl) || '/wp-json/ct/v1/';

    container.classList.add('ct-wizard--loading');

    fetch(restUrl + 'tree/' + moduleId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        container.classList.remove('ct-wizard--loading');
        if (data.code) {
          renderError(container, 'Could not load decision tree.');
          return;
        }
        runWizard(container, data);
      })
      .catch(function () {
        container.classList.remove('ct-wizard--loading');
        renderError(container, 'Could not load decision tree.');
      });
  }

  // ─── Build lookup maps and start the state machine ─────────────────────────
  function runWizard(container, data) {
    var nodeMap = {};
    data.nodes.forEach(function (n) { nodeMap[n.id] = n; });

    // edgeMap: source node id → array of outgoing edges
    var edgeMap = {};
    data.edges.forEach(function (e) {
      if (!edgeMap[e.source]) edgeMap[e.source] = [];
      edgeMap[e.source].push(e);
    });

    var history   = []; // stack of previously visited node IDs
    var currentId = data.rootNodeId;

    function render() {
      var node = nodeMap[currentId];
      if (!node) { renderError(container, 'Tree data error: node not found.'); return; }

      container.innerHTML = '';

      // Breadcrumb trail
      if (history.length > 0) {
        var trail = el('div', 'ct-wizard__trail');
        history.forEach(function (id, i) {
          var step  = nodeMap[id];
          var crumb = el('span', 'ct-wizard__crumb');
          crumb.textContent = step ? step.data.label : id;
          trail.appendChild(crumb);
          if (i < history.length - 1) {
            var sep = el('span', 'ct-wizard__sep');
            sep.textContent = ' › ';
            trail.appendChild(sep);
          }
        });
        container.appendChild(trail);
      }

      // Step title
      var heading = el('h3', 'ct-wizard__heading');
      heading.textContent = node.data.label;
      container.appendChild(heading);

      if (node.data.isTerminal) {
        renderTerminal(container, node);
      } else {
        renderQuestion(container, node, edgeMap);
      }

      // Navigation row (back + restart)
      if (history.length > 0) {
        var nav = el('div', 'ct-wizard__nav');

        var backBtn = el('button', 'ct-wizard__back');
        backBtn.textContent = '← Back';
        backBtn.type = 'button';
        backBtn.addEventListener('click', function () {
          currentId = history.pop();
          render();
        });
        nav.appendChild(backBtn);

        var restartBtn = el('button', 'ct-wizard__restart');
        restartBtn.textContent = 'Start again';
        restartBtn.type = 'button';
        restartBtn.addEventListener('click', function () {
          history = [];
          currentId = data.rootNodeId;
          render();
        });
        nav.appendChild(restartBtn);

        container.appendChild(nav);
      }
    }

    render();
  }

  // ─── Render a decision step ─────────────────────────────────────────────────
  function renderQuestion(container, node, edgeMap) {
    if (node.data.question) {
      var q = el('p', 'ct-wizard__question');
      q.textContent = node.data.question;
      container.appendChild(q);
    }

    var edges   = edgeMap[node.id] || [];
    var choices = el('div', 'ct-wizard__choices');

    // Sort edges to ensure consistent Yes/No order (Yes first)
    edges.sort(function (a, b) {
      var answerA = (a.answer || '').toString().toLowerCase();
      var answerB = (b.answer || '').toString().toLowerCase();
      if (answerA === 'yes') return -1;
      if (answerB === 'yes') return 1;
      return 0;
    });

    edges.forEach(function (edge) {
      var btn = el('button', 'ct-wizard__choice');
      btn.textContent = edge.label;
      btn.type = 'button';

      var answer = (edge.answer || edge.label || '').toString().trim().toLowerCase();
      btn.dataset.answer = answer;

      if (answer === 'yes' || answer === 'y' || answer === 'true') {
      btn.classList.add('yes');
      } else if (answer === 'no' || answer === 'n' || answer === 'false') {
      btn.classList.add('no');
      }

      btn.addEventListener('click', function () {
      // history is accessible via closure from runWizard
      // We need to push here — use a parent-scope trick via the nav render
      container.dispatchEvent(new CustomEvent('ct:advance', { detail: { targetId: edge.target } }));
      });

      choices.appendChild(btn);
    });

    container.appendChild(choices);

    // Listen for advance events emitted by choice buttons.
    container.addEventListener('ct:advance', function handler(e) {
      container.removeEventListener('ct:advance', handler);
      // We need access to history from runWizard — restructure to closure approach.
      // This event approach requires the closure to be set up differently.
      // See: history is captured in runWizard's closure. Buttons call render() directly.
    }, { once: true });
  }

  // ─── Render a terminal (end) step ──────────────────────────────────────────
  function renderTerminal(container, node) {
    // Body content (HTML from WP the_content filter)
    if (node.data.content) {
      var content = el('div', 'ct-wizard__content');
      content.innerHTML = node.data.content;
      container.appendChild(content);
    }

    // Best practice callout
    if (node.data.callout) {
      var callout      = el('div', 'ct-wizard__callout');
      var calloutLabel = el('strong');
      calloutLabel.textContent = 'BEST PRACTICE';
      callout.appendChild(calloutLabel);
      var calloutText = el('p');
      calloutText.textContent = node.data.callout;
      callout.appendChild(calloutText);
      container.appendChild(callout);
    }

    // Relevant legislation
    if (node.data.legislation && node.data.legislation.length > 0) {
      var legBlock   = el('div', 'ct-wizard__legislation');
      var legHeading = el('h4');
      legHeading.textContent = 'Relevant Legislation';
      legBlock.appendChild(legHeading);

      var legList = el('ul');
      node.data.legislation.forEach(function (leg) {
        var li = el('li');
        var a  = el('a');
        a.href = leg.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = leg.act + (leg.section ? ' — ' + leg.section : '');
        li.appendChild(a);
        legList.appendChild(li);
      });
      legBlock.appendChild(legList);
      container.appendChild(legBlock);
    }
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────
  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function renderError(container, message) {
    container.innerHTML = '';
    var err = el('p', 'ct-wizard__error');
    err.textContent = message;
    container.appendChild(err);
  }

  // ─── Re-wire renderQuestion to use direct closure (avoids event indirection) ─
  // Override the renderQuestion call in runWizard to close over history correctly.
  // The function above is replaced here with a self-contained version inside runWizard.
  // (The version above is kept as a reference; the working version is the closure below.)

  function runWizardFinal(container, data) {
    var nodeMap = {};
    data.nodes.forEach(function (n) { nodeMap[n.id] = n; });

    var edgeMap = {};
    data.edges.forEach(function (e) {
      if (!edgeMap[e.source]) edgeMap[e.source] = [];
      edgeMap[e.source].push(e);
    });

    var history   = [];
    var currentId = data.rootNodeId;

    function render() {
      var node = nodeMap[currentId];
      if (!node) { renderError(container, 'Tree data error: node not found.'); return; }
      container.innerHTML = '';


        // Nav row — at the bottom, after all content and choices
      if (history.length > 0) {
        var nav     = el('div', 'ct-wizard__nav');
        var backBtn = el('button', 'ct-wizard__back');
        backBtn.type = 'button'; backBtn.textContent = '← Back';
        backBtn.addEventListener('click', function () { currentId = history.pop(); render(); });
        nav.appendChild(backBtn);

        var restart = el('button', 'ct-wizard__restart');
        restart.type = 'button'; restart.textContent = 'Start again';
        restart.addEventListener('click', function () { history = []; currentId = data.rootNodeId; render(); });
        nav.appendChild(restart);
        container.appendChild(nav);
      }

      // Breadcrumb
      if (history.length > 0) {
        var trail = el('div', 'ct-wizard__trail');
        history.forEach(function (id, i) {
          var step  = nodeMap[id];
          var crumb = el('span', 'ct-wizard__crumb');
          crumb.textContent = step ? step.data.label : '…';
          trail.appendChild(crumb);
          if (i < history.length - 1) {
            var sep = el('span'); sep.textContent = ' › '; trail.appendChild(sep);
          }
        });
        container.appendChild(trail);
      }

     

      // Heading
      var heading = el('h3', 'ct-wizard__heading');
      heading.textContent = node.data.label;
      container.appendChild(heading);

      // Body content — shown for all nodes that have it (terminal or not)
      if (node.data.content) {
        var content = el('div', 'ct-wizard__content');
        content.innerHTML = node.data.content;
        container.appendChild(content);
      }
      // Callout — shown for all nodes that have it
      if (node.data.callout) {
        var callout  = el('div', 'ct-wizard__callout');
        var clabel   = el('strong'); clabel.textContent = 'BEST PRACTICE';
        var ctext    = el('p');     ctext.textContent   = node.data.callout;
        callout.appendChild(clabel);
        callout.appendChild(ctext);
        container.appendChild(callout);
      }
      // Legislation — shown for all nodes that have it
      if (node.data.legislation && node.data.legislation.length > 0) {
        var legBlock = el('div', 'ct-wizard__legislation');
        var legH     = el('h4'); legH.textContent = 'Relevant Legislation';
        legBlock.appendChild(legH);
        var legList  = el('ul');
        node.data.legislation.forEach(function (leg) {
          var li = el('li');
          var a  = el('a');
          a.href = leg.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.textContent = leg.act + (leg.section ? ' — ' + leg.section : '');
          li.appendChild(a); legList.appendChild(li);
        });
        legBlock.appendChild(legList);
        container.appendChild(legBlock);
      }

      // Question + choices — only for non-terminal nodes, always after any content above
      if (!node.data.isTerminal) {
        if (node.data.question) {
          var q = el('p', 'ct-wizard__question');
          q.textContent = node.data.question;
          container.appendChild(q);
        }
        // Choice buttons
        var choices = el('div', 'ct-wizard__choices');
        (edgeMap[node.id] || []).forEach(function (edge) {
          var btn = el('button', 'ct-wizard__choice');
          btn.textContent = edge.label;
          btn.type = 'button';
          btn.dataset.answer = edge.answer || '';
          btn.addEventListener('click', function () {
            history.push(currentId);
            currentId = edge.target;
            render();
          });
          choices.appendChild(btn);
        });
        container.appendChild(choices);
      }


      

     
    }

    render();
  }

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  function initWizardFinal(container) {
    var moduleId = container.dataset.moduleId;
    if (!moduleId) return;
    // Prevent double-init if called more than once on the same container.
    if (container.dataset.ctWizardInit) return;
    container.dataset.ctWizardInit = '1';
    var restUrl = (window.ctDTWizard && window.ctDTWizard.restUrl) || '/wp-json/ct/v1/';
    container.classList.add('ct-wizard--loading');
    fetch(restUrl + 'tree/' + moduleId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        container.classList.remove('ct-wizard--loading');
        if (data.code) { renderError(container, 'Could not load decision tree.'); return; }
        runWizardFinal(container, data);
      })
      .catch(function () {
        container.classList.remove('ct-wizard--loading');
        renderError(container, 'Could not load decision tree.');
      });
  }

  function initAll() {
    document.querySelectorAll('.ct-wizard').forEach(initWizardFinal);
  }

  // Run immediately if DOM is already ready (handles race conditions with page builders).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Expose init for dev.html module-picker swap.
  // Dev helper — safe to leave in prod (read-only, no side effects)
  window.__ctInitWizard = initWizardFinal;

}());
