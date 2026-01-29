---
title: "novel"
layout: archive
permalink: /novel
---


{% assign posts = site.categories.novel %}
{% for post in posts %} {% include archive-single.html type=page.entries_layout %} {% endfor %}