---
layout: single
title:  "2025년도 연구 계획"
categories:
  - laboratory
tag: [active_slam, path_planning, robotics, slam, mapping, 3d_lidar]
---

연구 분야: Active SLAM 
연구 주제: SLAM 맵핑을 효율적으로 진행하기 위한 로봇의 자율주행 경로계획
연구원: 조형남
별칭: 마식(馬植)

## 이 전까지의 진행 내용

DWA를 RRT와 융합하여 로봇을 이동하는 것을 진행했었습니다. 이후 잠시 다른 곳에서 협력 요청이 있었어서 시뮬레이션을 하나 개발했었습니다. 나중엔 그 시뮬레이션을 기반으로 제 active slam을 실험하기 위한 시뮬레이션 제작과도 연결이 되는데, 이건 나중에 설명하겠습니다.

이후 새로운 주제를 찾기 위한 과정들을 거쳤는데, 이제 그 과정들을 소개할까 합니다. 

앞과 마찬가지로 이 다음부터는 편한 말투로 작성했습니다. (쓰다 보니까 저렇게 쓰게 됩니다.)

(이 와중에 1월 초에 A형 독감에 걸렸었습니다. 건강 조심하세요.)


## 새로운 도전, 특허

학부생 마지막 시험기간동안 같은 내용만 계속 보기가 좀 그래서 불현듯 특허거리를 하나 생각했었다. 그 내용이... 지금 보면 별볼일 없어서 여기 블로그에 올려도 큰 영향은 없을 것 같다고 생각함.

![1번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/1.png)
<center>Fig 1. Patent idea: Create cluster binary cross paths.</center>  
<br>

이게 '군집 쌍원 교차 경로 생성' 이라는 아이디어 였는데, 요점은 벽면 혹은 라바콘을 LiDAR나 Scaner 같은 걸로 훑으면 그걸 클러스터링 한 다음에 원을 기반으로 뭉쳐주고, 그 도형들의 교점으로 이동 경로의 노드를 만들자는 아이디어였음.

![2번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/2.png)
<center>Fig 2. Explanation 1 of patent ideas</center>  
<br>

![3번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/3.png)
<center>Fig 3. Explanation 2 of patent ideas</center>  
<br>

![4번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/4.png)
<center>Fig 4. Explanation 3 of patent ideas</center>  
<br>

![5번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/5.png)
<center>Fig 5. Explanation 4 of patent ideas</center>  
<br>

사실 별 내용은 아니다. 이런게 특허로 쓸 수 있는가... 하면 쓸 수는 있다. 하지만 돈이 안되는 걸 넘어서, 쓸데 없는 유지비만 발생시키는 아이디어가 될 확률이 99%이다. 그래서 그냥 블로그에 올리는 것.

위 내용에 대한 설명은 각 첨부된 이미지들을 보면 되리라 생각되는데, 이 특허의 바람이 새로운 길을 잠시 인도하였다.

참고로 특허 계획은 무산되었다. 애초에 그동안 한게 특별한 성과가 있어야 하는 것인데, 잠깐 생겼던 아이디어가 좌초된 이상... 더이상의 동력은 없었기 때문이다.


## 주제를 찾기 위한 조사

당시 세미나 발표 시기와 맞물리는 떄였는데, 어차피 새 연구 주제를 찾으려면 논문을 많이 읽어야 하는 시즌이었다.

연구 분야는 우선 경로계획임은 분명 하였고, 선택지는 대략 3가지로 보였었다.

첫번째는 전역. 두번째는 지역. 세번째는 인식 융합.

놀랍게도 세번째를 먼저 고려하여 논문 조사를 하였다. 키워드로 설명하자면, 'Object Detection'을 'Path Planning'에 적용한다는 개념이다. 이를 다른 말로 Perception Path Planning이라 부르는 것 같았는데, 문제는 내가 생각했던 '객체인식 + 경로계획'이 아니라 '객체인식'만 나오는 것이다.

논문 조사를 하는 과정에서 내가 되게 욕심이 많았나? 하는 생각이 들었다. 그래서 인식 융합은 포기하고, DWA와 경로계획 자체의 최신 트랜드를 조사하는 것으로 선회하였다.

그리고 이 과정에서 추가로 하나 더해지는 것이 있는데, 그것은 특허와 연구 동료를 통해 영감을 받은 'Skeleton algorithm'이다. 이것은 간단히 말해서 어떤 두께가 있는 물체가 있다면, 그 뼈대를 추출한다는 의미가 있는 알고리즘을 말한다. 그래서 이름이 'Skeleton'인 것이다.

아무튼 위와 같은 목표로 찾아보게 된 논문들이 몇편 있었는데, 그중 3개만 논문 대표 그림과 함께 간략히 소개하겠다.

![6번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/6.png)
<center>Fig 6. Huang, Jinshan, and Bohan Chen. "Improved 3D UAV Path Planning Algorithm Based on Combined DWA and APF." 2024 IEEE 7th International Conference on Information Systems and Computer Aided Education (ICISCAE). IEEE, 2024.</center>
<br>

이 논문은 DWA와 APF를 융합한 새로운 지역 경로 계획을 말한다. 동적 장애물에 대한 효율적인 회피를 할 수 있다는 것이 주요 기여 사항.

![7번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/7.png)
<center>Fig 7. J. Fan et al., "An Improved Path Planning Algorithm With Adaptive Parameters and Predictions," in IEEE Systems Journal, vol. 17, no. 3, pp. 4911-4921, Sept. 2023, doi: 10.1109/JSYST.2023.3274187.</center>
<br>

이 논문은 세미나로 발표도 했던 논문인데, 그 중요성은 높지 않다. Polyfit(고차다항식을 통한 최소제곱법)을 통해서 동적 장애물의 미래 위치를 예측해서 효율적으로 피한다는 것인데... 말이 고차다항식이지 사실상 보면 1차 식만 쓴 것 같다. 5차까지 갈 필요도 없고.

다만 이 논문이 시사하는 것은 장애물의 미래 위치를 예측한다는 것인데, 이와 같은 생각으로 여러 확률 필터를 사용한 논문들도 있다는 것을 알게 되었다.

그래서 장애물의 위치를 확률 기반으로 예측해서 움직이는 경로계획을 연구할까 생각했었다. (그러나 연구분야로 선정되지 않았다. Active SLAM 전까지는 가장 유력했던 연구주제였음.)

![8번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/8.png)
<center>Fig 8. J. Chang, N. Dong, D. Li, W. H. Ip and K. L. Yung, "Skeleton Extraction and Greedy-Algorithm-Based Path Planning and its Application in UAV Trajectory Tracking," in IEEE Transactions on Aerospace and Electronic Systems, vol. 58, no. 6, pp. 4953-4964, Dec. 2022, doi: 10.1109/TAES.2022.3198925.</center>
<br>

이는 특허를 생각하는 과정에서 첫 아이디어가 바로 좌초된 이후 Skeleton을 쓰면 어떨까? 하는 생각으로 조사한 논문이다. 위 논문의 경우 2차원 뿐 아니라 3차원에 대한 경로를 만드는데에 스켈레톤 알고리즘이 쓰였다. 이를 좀 더 발전시키면, SLAM을 통해서 매핑된 3차원 지도를 skeleton과 결합한다면? 되게 좋은 아이디어라고 생각했었다. 

심지어 이와 관련된 논문이 있기는 있는데 별로 없었다. 2025년 1월 기준으로 본게 많이 쳐줘야 5개 정도? 와중에 1개는 arXiv였다. 그러면 충분히 수요는 있는데 아직 시작단계라는 의미인 것이라 생각되었고, 이는 유력 연구주제 2순위였다. (그리고 선택되지 못했다.)

이렇듯 경로계획이라는 틀 내에서 새로운 주제를 찾고자 많은 논문을 살펴보는 시간을 가졌었다.

그러나 결국 세미나때 교수님께서 말씀해주신 Active SLAM이라는 주제를 선택하게 되었다. 아마 오래 고민하시다가 결론을 내렸었는데, 말할 타이밍이 세미나였던 것 같다. (그리고 세미나직전 시점에서 독감 걸렸다.)

그렇게 2025년의 연구 주제는 Active SLAM이라는 topic으로 막을 올리게 되었다.


## 서베이 시작

지금까지 Active SLAM이라고 말하고 있었다. 그러나, 처음부터 Active SLAM이라고 알고 있지는 않았다. 교수님께서 말씀하신 것은 "3차원 공간 맵핑을 위한 미지의 환경에 대한 효과적인 최적 경로계획"이었다.

이 말을 토대로 한번 조사를 하라고만 말씀 하셨다. 지금와서 생각해보자면 Active SLAM이라는 주제를 뜻하는 단어에 알아서 도달하는지 시험하신 것으로 보인다. ... 물론 아닐 것 같지만, 이렇게 생각하면 재밌으니까.

먼저 매핑을 위한 경로계획에 대해서 검색하면서 총 24개의 논문을 찾았다. 찾는 과정은 제목을 보고, 초록을 보고, 서론을 본다. 끝. 어지간하면 이정도고, 좀 아리까리하면 결론 파트나 방법론 파트를 보았다.

그러다가 Frontier에 대해서 접하였다. "Efficient and High Path Quality Autonomous Exploration and Trajectory Planning of UAV in an Unknown Environment"라는 논문을 한번 읽어봤는데, 여기서 사용한 방법론중 하나가 Frontier였던 것.

![9번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/9.png)
<center>Fig 9. Schmid, Lukas, et al. "An efficient sampling-based method for online informative path planning in unknown environments." IEEE Robotics and Automation Letters 5.2 (2020): 1500-1507.</center>
<br>

Frontier란 U(Unknown) F(Free) O(Occupied) 맵핑 방식에서 U와 붙어있는 F를 지칭하는 말이다. 

이 Frontier가 존재한다는 말은 센서에 관측되지 않았을 뿐 아직 길(Free)이 있을 가능성이 존재하는 곳이기 때문에 이 부분을 계속해서 추적하면 로봇이 속한 해당 area를 모두 mapping할 수 있다는 의미인 것이다.

위 논문에서는 샘플링에 관한 내용도 조금 있는데, 중요하지 않아서 패스. 중요한 것은 이 Frontier를 사용한다는 것을 이 시점에서 캐치했다는 것.

그리고 논문을 좀 더 읽다보니 Active SLAM이 이 주제를 의미함을 확신하게 되었다. 이게 좀 애매했던게, 논문 조사하면서 이 단어가 계속 튀어나왔었는데 뭔가 단어 자체가 추상적인 감이 있어서 "3차원 공간 맵핑을 위한 미지의 환경에 대한 효과적인 최적 경로계획"이랑 "Active SLAM"이 동일한 의미를 가지는지 1~2개 논문으로 단정짓기 어려웠다. 그래서 수차례 논문을 조사한 결과 동일하다는 것을 알아냈다. 여기에 대충 2~3일 정도 걸렸음.


## Active SLAM 조사

지금까지는 일종의 탐사 느낌이 짙었다. 그러나 1월 중순이 넘어가면서 본격적으로 드라이브를 밟기 시작한다. 이 시즌에는 연구실의 Jackal 로봇 세팅과 Turtlebot 4 세팅을 다시 준비하고 LiDAR들을 관리하기도 하였으며, Ouster를 사용하려는 시도가 있었다. (Ouster는 펌웨어 및 드라이버 이슈로 안되었지만... 그리고 이때 고등학생들 대상으로 하는 학교 전공 체험 행사 날이 섞여있었다.)

본격적으로 Active SLAM을 제대로 알기 위해서는 이 분야의 흐름을 잘 설명하고 그 원리를 잘 풀어서 쓴 논문을 보아야 했다. 그런 의미에서 이번 2025년 계획에서 소개할 가장 중요한 것은 Active SLAM을 알 수 있는 논문을 소개하는 것이다. 소개할 논문은 "Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights(2018)" 라는 논문과 "Autonomous Exploration Method for Fast Unknown Environment Mapping by Using UAV Equipped With Limited FOV Sensor(2024)"라는 논문이다.

위 두 논문은 별도로 누가 이 분야에서 이걸 추천하더라, 이런 경로를 통해서 알게 된 것이 아니다. 그저 30개의 주제에 적합한 초록을 가진 논문들을 조금씩 읽어보다가 그중 본인이 직접 선택한 논문이다. 때문에 이 두 논문은 지극히 마식_조형남의 개인적인 사견으로서 Active SLAM을 이해하는데에 도움이 된다고 생각됨을 염두에 두었으면 한다.


## D\* 알고리즘

"Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights"
논문 링크: https://ieeexplore.ieee.org/abstract/document/7878681

위 논문은 Active SLAM의 기본적인 원리들을 보여주는 논문이라 할 수 있다. 초심자라도 이해하기 어려운 개념들을 많이 사용하진 않고, 무엇보다 서론(겸 배경 연구)에서 Active SLAM을 이해하기 쉽게 설명한다. 그래서 이 논문이 좋다고 생각했다.

위 논문에서는 아래와 같은 구조로 이루어진다고 한다.

![10번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/10.png)
<center>Fig 10. 방법론 전체 순서도; Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights</center>
<br>

Fig 10은 그냥 논문의 전체 개괄적인 내용이라서 상징적으로 넣었다. 중요하진 않다. 중요한 것은 다음 그림인데, 논문의 핵심이다.

![11번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/11.png)
<center>Fig 11. Graph based SLAM에서의 Loop Closing과 그 가능성에 대한 그림; Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights</center>
<br>

이 논문에서는 우선 여러 SLAM 중에서도 Graph-based SLAM에 대한 개념을 아는 것이 매우 중요하다.

---

작성중

참고 유튜브 링크 d\* 알고리즘 기초 영상: https://www.youtube.com/watch?v=e_7bSKXHvOI
