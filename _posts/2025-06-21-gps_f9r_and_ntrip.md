---
layout: single
title:  "Ublox F9R GPS ROS2 Humble 연결"
recommended: true
categories:
  - laboratory
tag: [GPS, RTK, F9R, NTRIP]
---

## 작성 이유

올해 3월부터 5월까지 해결하고자 하였던 힘든 일의 결과물입니다.
ROS2에서 GPS를 연결하여 topic을 받아내는 것을 하였습니다.
이게 F9P의 경우는 많이 있었는데, F9R은 별로 없었습니다.

여러 패키지와 레포지토리를 사용하다가 조합한 결과물을 제 깃허브 레포지토리로 공유하였습니다.
통합 레포지토리는 다음과 같습니다.
[gps_ws](https://github.com/aktmdtkd/gps_ws)

파일은 워크스페이스 상태로 공유하겠습니다.

GPS를 해결하고자 했던 그 과정은 너무 번잡하고 읽는 분들께는 불필요하여 생략하겠습니다.
(몇 주 지나서 많이 잊어먹기도 했습니다.)

우선 바로 사용하는 방법을 설명하고, 이후 각각에 대한 설명을 드리겠습니다.

## GPS

### GPS Workspace using menual

우선 GPS에 필요한 라이브러리 설치해야 합니다.

> sudo apt update

> sudo apt install libasio-dev

> sudo apt install ros-humble-diagnostic-updater

> sudo apt install ros-humble-nmea-msgs

그리고 위에서 알려드린 워크스페이스를 빌드 하고 소싱합니다.

> colcon build --symlink-install --cmake-args -DCMAKE_BUILD_TYPE=Release

> source install/setup.bash

GPS를 연결하기 위한 시리얼 포트 확인합니다.
가장 쉽게 알수 있는 방법은, GPS USB를 연결하기 전과 연결한 후의 모습을 보는 방법이 있습니다.

> ls /dev/ttyACM*

그래서 낮은 번호를 GPS-ROS2 연결하는 경우에서 사용하고, 큰 번호를 NTRIP(RTK보정)을 하는 경우에서 사용합니다.
즉, yaml파일 설정에서 쓴다는 것입니다.

그리고 나중에 그 yaml 파일을 파라미터로 사용하여 명령어를 실행합니다. 해당 명령어는 아래와 같습니다.

> ros2 run ublox_gps ublox_gps_node --ros-args --params-file /your_path/ublox_config.yaml

> ros2 launch ntrip_client ntrip_client.launch.py params_file:=/your_path/ntrip.yaml

파일 실행 이때 yaml 파일은 위치를 잘 고쳐서 사용해야 합니다.

### Detail of GPS ROS2

ublox의 gps드라이버를 수정한 것입니다.

만든 이유는 제가 사용하는 GPS가 ZED-F9R 기반이고, 사용하는 PC가 Ubuntu 22.04에 ROS2 Humble인데, 잘 맞지 않은 부분이 조금 있어서 Fork하여 새로 작성하게 되었습니다.

이게 여러가지 엎치락 뒤치락 해서, ublox를 fork하긴 했는데... 좀 많이 다르게 되었습니다.

대체로 크게 바뀌었는데, 저도 막 작업하다가 이것 저건 손보면서 만들어진 것이라 잘 기억이 나진 않습니다.

자잘한 것들은 ublox나 ublox_gnss 같은 레포지토리를 참고했고, F9R을 지원하는 레포지토리들도 많이 참고했습니다.

굵직한 친구들 중에서 수정한 것은 다음과 같습니다.

yaml 파일 따로 만들어서 사용한 것 이건 별도로 설명하진 않겠습니다. 사용하려고 애쓰다 보니 필요했습니다.

IMU 오프셋 조정 ublox_gps/src/adr_udr_product.cpp 부분을 보면 아래에 크게 주석이 된 부분과 활성화된 부분이 있습니다. 샘플로 보면 다음과 같습니다.

```
if (data_type == 14) {
  if (data_sign == 1) {
    imu_.angular_velocity.x = 2048 * ( 3.14159265359 / 180 ) - data_value * rad_per_sec;
  } else {
    imu_.angular_velocity.x = data_sign * data_value * rad_per_sec;
  }
} else if (data_type == 16) {
  //RCLCPP_INFO(node_->get_logger(), "data_sign: %f", data_sign);
  //RCLCPP_INFO(node_->get_logger(), "data_value: %u", data_value * m);
  //원래 8191이었는데, 오차가 있어서 직감으로 2^13인 8192바꿨더니 오차 확 사라짐
  if (data_sign == 1) {
    imu_.linear_acceleration.x = 8192 - data_value * m_per_sec_sq;
  } else {
    imu_.linear_acceleration.x = data_sign * data_value * m_per_sec_sq;
  }
```

위 linear랑 angular랑 둘 다 이상했었는데... linear의 경우 2^13인 8192가 아니라 1을 뺀 8191이었고, angular의 경우 2048이었습니다.

나중에 알고보니, linear의 오차는 저 1을 괜히 뺀 값인 8191을 써서 문제였고, angular의 경우 2048을 그냥 쓰면 안되고, 저걸 라디안 디그리 변환을 거쳐야 했었습니다.

그게 근삿값이 35.75였는데(이 값을 어떻게 찾았는가? 알고싶지 않았다.) 이게 우연하게도 2048 * ( 3.14159265359 / 180 )과 가까워서 극적으로 정체를 알게 된 것 입니다.

### Detail of NTRIP

> ls /dev/ttyACM*

위 명령어를 쳐서 나오는 새로운 결과물이 2개라면, 하나는 위의 ublox_F9R에서 사용하시고, 다른 하나를 ntrip에 연결해야 합니다.

둘을 같은 포트로 사용하시면 충돌납니다.

앞서 말씀 드렸듯 GPS를 연결하기 전에 쳐보시고, GPS를 연결한 후에 쳐보시면 어느 곳에 연결이 되는지 알 수 있습니다.

제 경우엔 /dev/ttyACM1과 /dev/ttyACM2였습니다.

한국인의 경우에는 국토지리정보원에 가셔서 가입하고 RTK 신청해야 합니다. 아이디 만드시면 비번은 무조건 ngii일거에요. 그외 정보는 그곳에서 전부 제공할겁니다.

### Review

저는 개인적으로 매우 힘들었습니다.

주변에 물어볼 사람도 없고, GPS는 처음 다뤄보는데, 심지어 기종 자체가 많이 다뤄본 사람도 없었습니다.

한국인은 물론이고, 영미권에서도 F9R은 유독 없더라고요.

그래서 많이 시도하면서 진행했습니다.

GPS 연결 자체도 문제였지만, NTRIP연결(RTK보정)의 경우도 많이 힘듭니다.

나중에서야 알았지만, RTK 보정이 되면 status가 2가 되어야 하는데, 이게 0으로 유지되는 경우도 있습니다.

마지막으로 하나 더 말씀드리자면, GPS의 안테나(제 경우 검은색 정사각형)는 되도록 높이 높이 있어야 합니다.

지면으로부터 1m 정도로는 조금 불안정하고, 지면으로부터 1.5m 이상은 떨어져야 잘 작동합니다.

PS. 점심 시간 등 태양빛이 강한 경우, 혹은 비가 내린다거나(당연히 이런 날은 로봇 가지고 못 나가시겠죠) 숲(나무에 수분이 많아서)같이 물 속성이 짙은 장소일수록 GPS가 잘 잡히지 않습니다.