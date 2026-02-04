---
layout: single
title:  "AR Test"
categories:
  - laboratory
tag: [AR, Camera]
---


## WebXR Spatial Mapping

스마트폰으로 V-SLAM... 은 아니고,  돌려보기

스마트폰의 카메라를 통해 공간을 인식하고, 인식된 표면에 점을 남겨 3D 지도를 그리는 실험입니다.

(안드로이드 크롬 브라우저에서 'WebXR Incubations' 플래그가 필요할 수 있습니다.)

<div style="width: 100%; height: 600px; border: 2px solid #333; border-radius: 10px; overflow: hidden; position: relative;">
  <iframe 
    src="/assets/games/ar_depth/index.html" 
    width="100%" 
    height="100%" 
    frameborder="0" 
    allow="camera; xr-spatial-tracking"
    scrolling="no">
  </iframe>
</div>

**사용 방법:**
1. 하단의 **START AR** 버튼을 누르세요.
2. 바닥과 벽을 천천히 비추며 스마트폰을 움직이세요.
3. 카메라가 인식한 표면에 **녹색 점**들이 자동으로 생성되어 공간을 형상화합니다.

다만 이후에 생성된 그 포인트들을 따로 관찰할 수 있도록 만들고 싶은데, 그거는 잘 안되네요.