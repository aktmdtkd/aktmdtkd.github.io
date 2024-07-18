---
title: "novel"
layout: archive
permalink: categories/#novel
---


{% assign posts = site.categories.novel %}
{% for post in posts %} {% include archive-single.html type=page.entries_layout %} {% endfor %}