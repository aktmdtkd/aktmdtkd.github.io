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
논문 링크: [IEEE](https://ieeexplore.ieee.org/abstract/document/7878681)

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

Graph-based SLAM을 간략히 설명하자면 다음과 같다. 

Node와 Edge로 구성되는 Graph를 구성하는 방식으로 지도를 맵핑한다. 이때 Node는 방향과 pose값을 가지고 있고, Edge는 제약(constraint)을 가진다. 이 제약이라는 것은 앞 노드와 뒷 노드 사이의 제약인데, 쉽게 말해서 둘의 위치 차를 의미한다. 이 둘을 정리하면 이렇게 된다.

> Node: 로봇의 시간별 자세(pose) $\rightarrow$ 변경 가능
>
> Edge: pose간의 제약조건 $\rightarrow$ 변경 불가능 $\rightarrow$ 사실 변경 가능

여기서 변경 가능하니 마니 이런 말이 있다. 이 말은 무엇이냐면 주어진 Node와 Edge를 통해서 맵핑 한번 하고 끝이 아니기 때문이다.

Graph-based SLAM의 꽃은 최적화이다. 최소 제곱 최적화를 통해서 Edge(constraint)를 기반으로 적합한(최적화된) Node의 위치들을 재구성한다. 그래서 Node와 Edge를 로봇이 측정하면서 이동할 때 초기 매핑하는 과정은 Front-End라 하고(Loop Closing 감지하는 것도 포함), 최소 제곱법을 통해서 그래프의 최적화를 하는 작업은 Back-End라고 한다.

이때 Edge는 변경 불가능이었다가 나중엔 변경 가능하다고 말했는데, 일단은 상수 취급 해주면서 Node를 재구성 한다. 그러나 최적화 과정에서 각 Edge에 대해서 오차 범위 내에서 변경을 하는 것이다. 즉, Edge는 어느정도 오차를 감안해서 그 범위에서 변경한다는 것이고, Node는 그런 범위 없이 바뀐다는 것을 말한다.

그리고 Loop Closing이란 것이 중요하다. Fig 11을 보면 알 수 있는데, Loop Closing이란 이미 지나온 길을 다시 가서 경로가 Loop되는 지점이 생기는 것을 말한다.

Loop Closing은 기존 Node와 현재 리얼 타임으로 새로 생기는 Node사이의 새로운 Edge 관계를 추가하는데, 이는 곧 정보의 추가를 의미한다. 바로 최적화를 하기 위한 정보의 추가. 그러므로 Graph-based SLAM에서는 Loop Closing이 존재할 경우 매핑 정확도가 올라가게된다.

![12번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/12.png)
<center>Fig 12. ND\* 알고리즘의 작동 모습; Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights</center>
<br>

위 그림을 보면 그래프의 R이랑 G, 그리고 초록색이 있다. R은 로봇의 처음 위치. G는 목표 지점. 그리고 초록색은 바로 경유지를 의미한다.

우리는 이 초록색 경유지를 설정하는 것에 집중해야 한다.

경유지는 일반적인 D\* 알고리즘 만으로는 만들 수 없다. 그래서 본 논문에서는 Negative D\* 알고리즘을 제안한다. 이는 음의 가중치를 사용하여 해당 노드에 대해서 목적지보다 먼저 들르게끔 유도하는 효과가 있다. 특히 ND\*는 경유지를 들른 직후 바로 그 노드의 가중치만 ***정상화*** 시켜주면 바로 별다른 버그 없이 원래 목적대로 사용할 수 있다는 깔끔함도 있다.

![13번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/13.png)
<center>Fig 13. 세 알고리즘의 특징과 차이.</center>
<br>

그러면 왜 굳이 D\* 알고리즘을 사용했는지 이유를 알아야한다. 각각은 분명 좋은 아이디어임은 맞으나 각각 치명적인 약점이 있다. 다익스트라의 확장 버전이 D\* 알고리즘인데, 원본보다 동적 환경에서의 계산이 더 빠르다. 그리고 A\*는 음수 가중치를 사용할 수 없으며, 벨만포드는 동적 환경에서는 계산 비용이 매우 높아진다. 이같은 이유로 D\* 알고리즘을 선택한 것이다.

그러면 이 D\* 알고리즘이 동적 환경에서 어떤 움직임을 보이는지 알아보자면, 다음 유튜브 영상을 보면 된다.

[D*_유튜브_링크](https://www.youtube.com/watch?v=e_7bSKXHvOI)

만약 유튜브를 들어가기 여의치 않다면 다음 그림을 보면 된다.

![14번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/14.png)
<center>Fig 14. D\* 알고리즘의 동적 장애물 회피 흐름 3장; https://www.youtube.com/watch?v=e_7bSKXHvOI</center>
<br>

위 흐름을 보면 알 수 있는건, D\* 알고리즘 자체가 뭘 하나 수정하더라도 전체 지도에 대한 연산을 통째로 바꿀 필요 없이, 일부만 수정해도 된다는 것이다. 동시에 경유지를 설정할 때, 가급적 들르면 좋은 것이지 꼭 들러야 하는 것을 의도하지 않을 수 있다는 점에서 강압적이지 않고 부드러운 연산을 유도한다는 장점도 있다. 

이같은 점들을 통해 위 논문의 핵심은 경유지를 설정하는 것과 그 경유지는 ND\* 알고리즘을 통해서 구현한다는 것이다. 이를 통해서 미지의 장소에 대한 SLAM을 효과적으로 진행할 수 있는 경로를 도출한다는 것이다.

이를 흐름으로 말하면 다음과 같다.

> 1. 최초 시작시 스캔+이동 시작
> > 1. 이동시 Frontier를 찾아서 이동
> 2. 이동중 장애물 발생시 D\* 알고리즘 수정을 통한 회피
> 3. 이미 지나온 길인 경우
> > 1. 현재 로봇과 근처의 인지된 Node의 거리가 임계값 미만인 경우 지나온 길임을 인식
> > 2. 임계값 미만인 Node들을 후보화
> > 3. 후보 Node들 중에서 토폴로지 거리가 임계값 이상인 경우 Loop Closing 선정
> > 4. 해당 Loop Closing에 대해서 지도상에서의 음수 가중치 부여

이때 음수 가중치는 다음 공식을 따르며 부여한다.

![15번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/15.png)
<center>Fig 15. 음의 가중치를 부여할때 사용하는 공식; Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights</center>
<br>

이 식이 의미하는 것은 현재 위치과 음의 가중치를 부여할 위치 사이의 토폴로지 거리값 차이가 클수록 비례하여 큰 값을 주는 것을 알 수 있다.

이런 방식을 사용하여 Active SLAM을 진행하게 되면 어떤 모습을 그리는지 보자.

![16번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/16.png)
<center>Fig 16. 실험 그래프 모형; Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights</center>
<br>

솔직히 이렇게 보면 무엇을 의미하는지 알 수 없다. 이걸 자세히 설명하기에 앞서서 무엇이 뭘 의미하는지 간단히 알아보자.

- 빨간 선 (Planned Path):로봇이 ND* 알고리즘을 통해 계산한 계획된 경로
- 초록 선 (Executed Path):로봇이 실제로 이동한 실제 경로
- 빨간색 X (Localization Points):루프 클로징 지점을 나타냄
- 폴리곤 (Explored Area):탐색된 환경(그림의 폴리곤 크기는 탐색 진행에 따라 점진적으로 확장)
- 직사각형 (Robot Position):로봇의 현재 위치

설령 위 기호의 뜻을 알더라도 그 뜻을 파악하는 것은 어려우므로 차례대로 확대하여 설명을 진행하겠다.

![17번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/17.png)
<center>Fig 17. 실험 그래프 모형; Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights</center>
<br>

우선 스텝 2에서 시작하여 움직인다. 이때 뭔가 ?를 그리다 마는 궤적으로 왼쪽에서 오른쪽으로 이동한다.

그리고 나서 스텝 3에서는 로봇이 오른쪽에서 왼쪽으로 이동한다. 그런데 지도를 보면 Loop Closing을 의미하는 빨간색 X 표시를 볼 수 있는데, 이 위치는 스텝 2에서 왔던 그 경로이다. 그 경로들 중에서 Node가 생겼고, 다시 돌아가는 과정에서 Loop Closing을 일으킬 Node를 따로 선정하여 해당 위치를 경유지로 하게끔 유도한 것이다.

![18번그림](https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2025-01-22-lab_plan_2025_activeslam/18.png)
<center>Fig 18. 실험 그래프 모형2; Path Planning for Active SLAM Based on the D* Algorithm With Negative Edge Weights</center>
<br>

이 흐름을 염두에 두고 보면 이후 과정들도 똑같다는 것을 알 수 있다. 과거의 경로를 지나오는 과정에서 생긴 Node들에 가까워질 때 Loop Closing을 일부러 일으키도록 하여 SLAM의 정확도를 높이는 방법론임을 알 수 있다.

이 논문은 Active SLAM의 한 방법론을 다루는데, 사용하는 SLAM의 종류는 Graph-based SLAM이었다. 그리고 이 SLAM은 Loop Closing이 발생하는 편이 더 높은 정확도의 지도를 만들 수 있다는 특징이 있었다. 따라서 이 논문에서는 D\* 알고리즘에 Negative 가중치를 Loop Closing이 필요한 Node에 부여하여 경유지 역할을 할 수 있도록 만들었다.

이 논문의 장점은 비교적 단순한 알고리즘을 사용하면서도 Active SLAM의 개괄적인 내용을 다루기 때문에 입문하기에 좋다. 하지만 Loop Closing을 사용하는 것을 보면 알 수 있듯 SLAM의 정확도를 높힌다는 것은 SLAM이 작동하는 것에 불신이 있다는 것을 의미한다. 요즘은 그러한 SLAM이 별로 없다는 것을 고려했을 때 현재로선 굳이 Loop Closing에 초점을 맞춰서 진행할 필요가 없다는 것이다.

그리고 6년이 흘러서 새로운 논문이 나오게 되는데...


## Limited FOV








---

작성중