---
layout: single
title:  "ROS2 humble nav2 build error"
categories:
  - laboratory
header:
  teaser: https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2024-10-26-DB/DB_image.png
  image: https://raw.githubusercontent.com/aktmdtkd/aktmdtkd.github.io/master/_posts/image/2024-10-26-DB/DB_image.png
---


---


## 이걸 쓰게 된 이유
nav2가 사용자에게 그다지 친절하지 못한 부분이 있다. 그래서 본인은 매우 어려움을 겪었었는데, 그냥 설치하고 싶다면, 
`sudo apt install ros-<ros2-distro>-navigation2`
`sudo apt install ros-<ros2-distro>-nav2-bringup`
이런 명령어 쳐서 설치하면 된다. 하지만 좀 더 깊은 내용으로 들어가게 될 사람이라면 github에 있는 파일들을 가져와서 직접 빌드해야하는데, 잘 안 될 것이다. 그게 어느 정도는 쓰는 사람이 코드를 파악해서 사용해야하기 때문에 의존성 설치라던가 도구 등을 구분해야한다. 때문에 ros2 humble을 사용하는 필자 입장에서 어떻게 설치가 되었는지 서술하려고 한다.

---
---
##  필자의 해법

우선 어떤 파일을 설치해야하는가? 24년도 7월 23일 기준으로 제일 최근 파일이 아니라 4일 전 파일을 설치하기를 권장한다. 그 까닭은... 안되기 때문이다. 여러 시도를 했는데 마땅한 해결책을 못찾아서 7월 19일 직전의 버전으로 설명하려고 한다. 이렇게 설치할 경우 아래 방법을 통해서 해결할 수 있었다.

---


1. **오버라이딩 허용**: 특정 패키지가 이미 `/opt/ros/humble`에 설치되어 있음을 나타내는 경고 메시지가 있다. 이 경우, `colcon build` 명령에 `--allow-overriding nav2_map_server` 옵션을 추가하여 오버라이딩을 허용할 수 있다. 
    
    `colcon build --allow-overriding nav2_map_server`
    
2. **GCC 버그 회피**: 내부 컴파일러 오류(세그멘테이션 오류)는 주로 GCC 버그로 인해 발생할 수 있다.
    
    - **GCC 재설치**:
        
        `sudo apt-get install --reinstall gcc-11 g++-11`
        
    - **GCC 버전 업그레이드**:
        
        `sudo apt-get update sudo apt-get install gcc-12 g++-12 sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 12 sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-12 12 sudo update-alternatives --config gcc sudo update-alternatives --config g++`
        
3. **메모리 부족 문제 해결**: 세그멘테이션 오류는 메모리 부족으로 인해 발생할 수도 있다. 다음과 같이 스왑 공간을 추가하여 문제를 해결할 수 있다:
    
    `sudo fallocate -l 4G /swapfile sudo chmod 600 /swapfile sudo mkswap /swapfile sudo swapon /swapfile sudo sh -c 'echo "/swapfile none swap sw 0 0" >> /etc/fstab'`
    
4. **캐시 정리**: `colcon`과 관련된 캐시를 정리하고 다시 빌드할 수 있다:
    
    `colcon build --cmake-clean-cache`
    
5. **(굳이 안해도 됨)병렬 빌드 제한**: 빌드 시 병렬 작업의 수를 제한하여 메모리 사용을 줄일 수 있다. 예를 들어, 병렬 작업 수를 2로 제한할 수 있다:
    
    `colcon build --executor sequential --parallel-workers 2`
    

---

세그멘테이션 오류가 여전히 발생한다면 다음과 같이 할 수 있다.

1. **GCC 버전 업그레이드**: 최신 버전으로 업그레이드하자. 이는 이미 설치된 GCC-11을 GCC-12로 업그레이드하는 과정이다.
    
    `sudo apt-get update sudo apt-get install gcc-12 g++-12 sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 12 sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-12 12 sudo update-alternatives --config gcc sudo update-alternatives --config g++`
    
2. **스왑 메모리 추가**: 시스템의 메모리가 부족할 수 있다.
    
    `sudo fallocate -l 4G /swapfile sudo chmod 600 /swapfile sudo mkswap /swapfile sudo swapon /swapfile sudo sh -c 'echo "/swapfile none swap sw 0 0" >> /etc/fstab'`
    
3. **빌드 캐시 정리**: 이전 빌드 캐시가 문제를 일으킬 수 있습니다. `colcon` 빌드 캐시를 정리해볼 수 있다.
    
    `colcon build --cmake-clean-cache`
    

---

빌드 중에 `ros_gz_sim` 패키지를 찾지 못해서 `nav2_system_tests`가 실패할 수 있다. 그러면 `ros_gz_sim` 패키지를 설치하고, `CMAKE_PREFIX_PATH`에 해당 경로를 추가하여 문제를 해결할 수 있다.

 1. `ros_gz_sim` 패키지 설치
	
	`sudo apt-get update sudo apt-get install ros-humble-ros-gz`

 2. `CMAKE_PREFIX_PATH` 설정

	`ros_gz_sim` 패키지의 경로를 `CMAKE_PREFIX_PATH`에 추가해야 한다. 이 경로는 `/opt/ros/humble`에 있습니다.
	
	`export CMAKE_PREFIX_PATH=$CMAKE_PREFIX_PATH:/opt/ros/humble`

 3. 다시 빌드 시도
	
	PC에게 기도 한번 올리고 명령어를 쳐봅시다.
	`colcon build --cmake-clean-cache`

---

기타 좋은 명령어
- `rosdep install --from-paths src --ignore-src -r -y`
	의존성 창출을 하기 위해서 사용
	
- `sudo apt install libtiff-dev libgdal-dev`
	이 친구들이 문제될 때 재설치할때 사용
	
- `colcon build --allow-overriding nav2_map_server`
	빌드시 사용할 수 있는 또다른 명령어. 뒤에 anv2_map_server는 다른 패키지 이름으로 바꾸어도 되는데, 아마 저 패키지를 써야할 상황이 많을 것이다.
	
- `sudo apt install python3-colcon-common-extensions`
	빌드하는 도구 자체가 이상한 경우를 대비해서 사용한다.
	
- `sudo apt-get remove --purge libtiff-dev libgdal-dev `
	아예 지워보고 해보는 것도 방법이 될 수 있다.
