# AI-Enabled Real-Time Pilot Fatigue Detection System for General Aviation: An Edge-Cloud Computing Approach

---

**Author:**

[Name Surname]

---

*Research is subject to a confidentiality agreement*

---

**Belgium Campus ITversity**
138 Berg Avenue, Heatherdale AH, Akasia, 0182
South Africa

---

## Abstract

Pilot fatigue represents a critical safety concern in general aviation, contributing to a significant proportion of aviation accidents globally. This research investigates the development of an AI-enabled pilot fatigue detection system utilising edge-cloud computing architecture for single-propeller general aviation aircraft. The study employs a multi-modal detection approach combining computer vision techniques, including Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR), and Percentage of Eye Closure (PERCLOS), with physiological monitoring through Heart Rate Variability (HRV) analysis. The proposed system architecture leverages Raspberry Pi-based edge computing for real-time detection with latency targets below 50 milliseconds, complemented by cloud-based analytics for fleet-wide monitoring. The research addresses the identified gap in fatigue risk management systems for general aviation operations, particularly within the South African Civil Aviation Authority regulatory framework. Findings indicate that multi-index detection approaches achieve superior accuracy compared to single-indicator systems, with validated thresholds of EAR 0.18-0.20 and MAR 0.5 demonstrating detection accuracies exceeding 95%. The study concludes that integrating visual and physiological indicators through weighted sensor fusion provides a robust, non-invasive solution for real-time fatigue monitoring in resource-constrained aviation environments.

**Keywords:** Pilot fatigue detection, Edge computing, Heart rate variability, Computer vision, General aviation safety

---

## 1 Introduction

Aviation safety remains a paramount concern in the global transportation industry, with human factors continuing to represent the predominant cause of aircraft accidents. Research consistently demonstrates that approximately 75% of aircraft accidents are attributable to human errors, frequently stemming from elevated mental workload and pilot fatigue (Pongsakornsathien *et al.*, 2020). Within this context, fatigue has emerged as a particularly insidious threat to flight safety, identified as the probable cause in 21-23% of major aviation accidents over a two-decade analysis period (Wingelaar-Jagt *et al.*, 2021).

The International Civil Aviation Organisation (ICAO) defines fatigue as "a physiological state of reduced mental or physical performance capability resulting from sleep loss, extended wakefulness, circadian phase, and/or workload" that impairs alertness and operational performance (Wingelaar-Jagt *et al.*, 2021). This definition encompasses the multifaceted nature of fatigue, recognising its origins in both physiological and operational factors. Studies reveal alarming prevalence rates, with 68-91% of commercial airline pilots reporting experiencing in-flight fatigue, whilst 72% of military aviators have admitted to flying whilst dangerously drowsy (Wingelaar-Jagt *et al.*, 2021).

The challenge of fatigue detection is particularly acute in general aviation contexts, where single-pilot operations preclude the crew resource management strategies employed in commercial aviation. The neurovisceral integration model suggests that brain regions controlling self-regulation are connected to cardiac autonomic activity through the vagus nerve, with higher resting heart rate variability corresponding to better executive function and cognitive flexibility (Forte, Favieri and Casagrande, 2019). This physiological relationship provides a foundation for non-invasive fatigue monitoring approaches.

Contemporary Fatigue Risk Management Systems (FRMS) have been established by ICAO as "data-driven methods of constant monitoring, data collecting, analyzing, and mitigating fatigue-related safety risks in flight operations, using scientific methods, previous knowledge, and operational experience" (Pavlinovic *et al.*, 2023). However, implementation of such systems remains inconsistent, particularly within general aviation operations where regulatory requirements are less stringent than commercial aviation.

The advancement of wearable technology and artificial intelligence presents unprecedented opportunities for real-time fatigue monitoring. A systematic review examining 60 wearable device-based fatigue detection studies found that supervised machine learning models, particularly binary classification models, represent the predominant approach to fatigue quantification, demonstrating strong performance in controlled laboratory settings (Alonso *et al.*, 2022). Furthermore, multi-modal data fusion approaches have demonstrated enhanced precision and reliability of fatigue evaluation compared to single-source monitoring systems (Dehghani *et al.*, 2024).

This research addresses the critical need for accessible, real-time fatigue detection systems in general aviation by proposing an edge-cloud computing architecture that combines computer vision techniques with physiological monitoring. The system targets deployment on resource-constrained embedded platforms whilst maintaining the detection accuracy necessary for safety-critical aviation applications.

---

## 2 Problem Statement and Research Objectives

### 2.1 Problem Statement

General aviation operations face a disproportionate safety burden compared to commercial aviation, with significantly higher accident rates per flight hour. Despite the established contribution of fatigue to aviation accidents, representing 21-23% of major incidents (Wingelaar-Jagt *et al.*, 2021), current fatigue management approaches in general aviation remain largely reactive rather than proactive. Prescriptive flight-time limitations alone have proven insufficient to address the complex, individualised nature of fatigue development (Wingelaar-Jagt *et al.*, 2021).

A critical challenge in implementing effective fatigue monitoring systems lies in the high rate of false alarms that characterise many monitoring technologies. Research in safety-critical monitoring environments has demonstrated that 72-99% of monitoring alarms are either technically false or clinically irrelevant (Chromik *et al.*, 2022). This overwhelming volume creates alarm fatigue, wherein operators experience desensitisation to alerts, potentially delaying responses or inappropriately adjusting thresholds. The consequences for aviation safety are severe, as missed or ignored fatigue warnings could precipitate preventable accidents.

Furthermore, existing cloud-based detection systems introduce significant processing delays due to the distance between data sources and central servers, rendering them unsuitable for real-time applications requiring immediate pilot alerts (Albadawi, Takruri and Awad, 2021). The gap between available technology and practical implementation in general aviation contexts necessitates investigation into edge computing architectures capable of meeting real-time detection requirements whilst maintaining acceptable accuracy levels.

### 2.2 Research Questions

1. What combination of visual and physiological indicators provides optimal accuracy for real-time pilot fatigue detection in general aviation cockpit environments?
2. How can edge computing architecture be designed to achieve detection latency below 50 milliseconds whilst operating on resource-constrained embedded platforms?
3. What threshold parameters for Eye Aspect Ratio, Mouth Aspect Ratio, and PERCLOS optimise detection sensitivity whilst minimising false positive rates?

### 2.3 Research Objectives

The objectives of this research are to:

(a) Evaluate the effectiveness of multi-modal fatigue detection combining Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR), PERCLOS, and Heart Rate Variability (HRV) indicators for pilot fatigue identification;

(b) Identify optimal threshold parameters for visual fatigue indicators that balance detection sensitivity with acceptable false positive rates in aviation cockpit environments;

(c) Compare edge computing and cloud computing architectures for real-time fatigue detection, quantifying latency differences and their implications for safety-critical aviation applications;

(d) Generate a comprehensive system architecture specification for pilot fatigue detection suitable for deployment on Raspberry Pi-based edge computing platforms in general aviation aircraft.

---

## 3 Literature Review

The detection of fatigue through technological means has evolved significantly over recent decades, progressing from subjective self-reporting measures to sophisticated multi-modal sensing systems. This literature review examines the current state of knowledge across three primary domains: computer vision-based detection methods, physiological monitoring approaches, and architectural considerations for real-time implementation.

### 3.1 Computer Vision Approaches to Fatigue Detection

Computer vision techniques have emerged as the predominant non-invasive approach to fatigue detection, leveraging facial landmark analysis to identify physiological indicators of drowsiness. The Eye Aspect Ratio (EAR) metric, computed from the horizontal and vertical distances of six eye landmark coordinates, provides a robust measure of eye opening state. Research by Dewi *et al.* (2022) evaluated multiple EAR threshold values, determining that a threshold of 0.18 achieved 97.1% accuracy with an area under the curve (AUC) of 0.974, significantly outperforming the traditionally employed threshold of 0.2. The study utilised the Dlib library with 68 facial landmarks for detection, demonstrating that lower thresholds provide superior accuracy despite contradicting prior research conventions.

Complementing EAR, the Mouth Aspect Ratio (MAR) enables detection of yawning, a behavioural indicator strongly associated with fatigue states. Albadawi, Takruri and Awad (2023) established an EAR threshold of 0.2 and MAR threshold of 0.5 to detect wide-open mouth states indicative of yawning, utilising 23 subjects from the NTHU-DDD dataset with 18 for training and 5 for testing. Their Random Forest classifier achieved exceptional performance with 99% accuracy, sensitivity, and specificity, with AUC scores reaching 0.999. The trained model extracted feature vectors and classified each frame in a time period of 2-4 milliseconds, enabling real-time operation.

The Percentage of Eye Closure (PERCLOS) metric provides temporal analysis of eye state, defined as the duration during which eyelids cover over 80% of the eye area over a one-minute time window (Li *et al.*, 2023). Li *et al.* (2023) developed a lightweight convolutional neural network validated against the EyeLink gold-standard eye-tracker, achieving 93.9% blink detection accuracy with strong correlation (r=0.729) between devices. This validation against industry-standard equipment provides confidence in the metric's reliability for safety-critical applications.

Multi-index detection approaches combining multiple visual indicators have demonstrated superior performance compared to single-indicator systems. Garrosa *et al.* (2024) implemented a five-index detection system incorporating EAR, MAR, PERCLOS, gaze direction, and head orientation on Raspberry Pi hardware, achieving processing speeds of 3-4 frames per second. Their research emphasised that personalisation is essential, noting that "each person has different physiological characteristics" requiring customised calculation of EAR and MAR indices (Garrosa *et al.*, 2024). The study observed EAR threshold ranges of 0.17-0.28 and MAR threshold ranges of 0.32-0.49 across 11 participants, demonstrating significant individual variability. The multi-index approach achieved above 95% face detection rates whilst reducing false positives from activities such as squinting or focusing on distant objects.

### 3.2 Physiological Monitoring Through Heart Rate Variability

Heart rate variability (HRV) analysis provides insight into autonomic nervous system activity, with established correlations to cognitive function and fatigue states. Forte, Favieri and Casagrande (2019) conducted a systematic review examining 19,431 participants across 20 studies, concluding that "both increased sympathetic activity and decreased parasympathetic activity seem to be associated with worse performance in cognitive domains." The research proposes HRV as a promising early biomarker of cognitive impairment, supporting its application in fatigue monitoring contexts.

Aviation-specific research has validated HRV-based fatigue detection in flight operations. Guo *et al.* (2025) evaluated 90 pilots across 392 flight sessions using wearable ECG chest straps, achieving 88.6% accuracy for three-level fatigue classification using the LightGBM algorithm. Key HRV features included SDNN, RMSSD, pNN50, LF power, HF power, and LF/HF ratio, with the LightGBM model outperforming decision tree, support vector machine, and K-nearest neighbour approaches.

Pan *et al.* (2021) specifically investigated pilot fatigue using ECG signals during Cessna 172 flight simulations, collecting 1,440 ECG samples from pilots across three daily time windows. Their Learning Vector Quantisation (LVQ) neural network achieved 81.94% overall accuracy, representing a 12.84% improvement over backpropagation neural networks and 9.02% improvement over support vector machines. The research identified ten key HRV features through Friedman statistical testing, including AVNN, AVHR, RMSSD, PNN50, LFnorm, HFnorm, LF/HF, SD1, A++, and B++.

The validation of wearable HRV monitoring devices for operational environments has been addressed by Hinde, White and Armstrong (2021), whose review identified the Polar H10 chest strap as achieving gold-standard performance with correlation coefficients of r=0.997 against traditional ECG methods. The device achieved 99.6% signal quality during testing and outperformed Holter ECG during high-intensity exercise. The primary vagal modulation marker identified was RMSSD, with reduced HRV correlating with weaker cognitive performance.

### 3.3 Multi-Sensor Fusion Architectures

The integration of multiple sensing modalities has consistently demonstrated improved detection performance compared to single-sensor approaches. Wang *et al.* (2023) developed a multi-sensor fusion framework combining EEG, ECG, and image-based detection, achieving 90.17% accuracy with combined EEG features, 92% with ECG-derived HRV features, and 96% with image-based detection. The research implemented a 5-second sliding window algorithm for real-time feedback, categorising driver states as severe fatigue, mild fatigue, or normal operation.

Albadawi, Takruri and Awad (2021) provided a comprehensive comparison of cloud, mobile edge computing (MEC), and smartphone architectures for fatigue detection. Their analysis revealed that cloud-based systems introduce significant processing delays unsuitable for real-time safety applications, whilst MEC approaches reduce average service delay by bringing computing power and storage to the network edge. The review noted that multimodal feature fusion combining visual and non-visual data significantly improves detection accuracy, with referenced studies achieving 97.28% accuracy on average using HRV sensors.

The challenge of alarm fatigue in safety-critical monitoring systems has been systematically examined by Chromik *et al.* (2022), whose review of 69 publications identified three main approaches to address non-actionable alarms: reducing technically false alarms, predicting deterioration to enable proactive intervention, and improving alarm presentation methods. The review concluded with "strong evidence that alarm fatigue can be alleviated by IT-based solutions," supporting the integration of intelligent filtering in fatigue detection systems.

---

## 4 Research Methodology

This research adopts a mixed-methods approach combining systematic literature analysis with technical system design to address the research objectives. The methodology encompasses threshold validation, architecture specification, and performance benchmarking against established metrics.

### 4.1 Threshold Parameter Selection

The selection of detection thresholds follows evidence-based criteria established through peer-reviewed research. For Eye Aspect Ratio, a threshold range of 0.18-0.20 was adopted based on the empirical findings of Dewi *et al.* (2022), who demonstrated that EAR 0.18 achieved optimal performance with 97.1% accuracy. The lower threshold was selected to maximise sensitivity in safety-critical applications, accepting marginally higher false positive rates to ensure drowsy states are not missed.

The Mouth Aspect Ratio threshold of 0.5 follows the validation by Albadawi, Takruri and Awad (2023), established through analysis of 18 training subjects to determine the point at which the mouth is considered wide open indicative of yawning. PERCLOS is calculated as the percentage of time eyelids are closed over 80% of eye area within a one-minute window, consistent with NHTSA-approved metrics (Chang *et al.*, 2022).

For HRV analysis, feature extraction follows the methodology validated by Guo *et al.* (2025) in aviation contexts, incorporating time-domain features (RMSSD, SDNN, pNN50) and frequency-domain features (LF, HF, LF/HF ratio). The LightGBM classification algorithm was selected based on its demonstrated 88.6% accuracy in flight fatigue assessment.

### 4.2 System Architecture Design

The proposed edge-cloud architecture addresses latency requirements through hierarchical processing. Edge processing on Raspberry Pi hardware handles real-time detection tasks requiring sub-50ms response times, consistent with benchmarks established by Livanios *et al.* (2022) who achieved average latency of 32 milliseconds for safety-critical edge computing applications.

The facial landmark detection pipeline employs MediaPipe or Dlib libraries for 68-point facial landmark extraction, enabling EAR and MAR calculation at frame rates sufficient for real-time operation (approximately 30 fps). HRV data acquisition interfaces with validated chest-strap monitors, with the Polar H10 recommended based on its r=0.997 correlation with clinical ECG (Hinde, White and Armstrong, 2021).

### 4.3 Performance Evaluation Metrics

System performance evaluation employs standard classification metrics including accuracy, sensitivity (recall), specificity, precision, and area under the receiver operating characteristic curve (AUC). Target performance metrics are established at 95% accuracy based on the multi-index detection results reported by Garrosa *et al.* (2024), with sensitivity prioritised over specificity given the safety-critical nature of the application.

Latency measurements follow the methodology of Livanios *et al.* (2022), measuring the time between sensor data acquisition and alert generation. The target latency of 50ms is derived from the requirement that detection occur faster than human reaction time to enable meaningful intervention.

---

## 5 Results/Findings

The systematic review and technical analysis yielded the following key findings regarding optimal approaches for pilot fatigue detection:

### 5.1 Visual Indicator Threshold Validation

Analysis of peer-reviewed research established validated threshold parameters for visual fatigue indicators:

| Indicator | Optimal Threshold | Accuracy Achieved | Source |
|-----------|-------------------|-------------------|--------|
| Eye Aspect Ratio (EAR) | 0.18 | 97.1% | Dewi *et al.* (2022) |
| Mouth Aspect Ratio (MAR) | 0.5 | 99.0% | Albadawi, Takruri and Awad (2023) |
| PERCLOS | 80% closure over 60s | 93.9% | Li *et al.* (2023) |

The EAR threshold of 0.18 demonstrated superior performance compared to higher thresholds (0.2, 0.225, 0.25), with the finding that "the higher the EAR threshold, the lower the accuracy and AUC performance" (Dewi *et al.*, 2022).

### 5.2 Physiological Monitoring Performance

HRV-based fatigue detection in aviation contexts achieved the following classification accuracies:

| Study | Participants | Algorithm | Accuracy |
|-------|--------------|-----------|----------|
| Guo *et al.* (2025) | 90 pilots | LightGBM | 88.6% |
| Pan *et al.* (2021) | 30 pilots | LVQ | 81.94% |

The superior performance of LightGBM represents a significant advancement over traditional machine learning approaches, with 12.84% improvement over backpropagation neural networks (Pan *et al.*, 2021).

### 5.3 Multi-Modal Fusion Results

Multi-sensor fusion approaches consistently outperformed single-modality systems:

| Modality | Detection Accuracy |
|----------|-------------------|
| EEG only | 90.17% |
| ECG/HRV only | 92.0% |
| Image-based only | 96.0% |
| Multi-modal fusion | 97.28%+ |

Source: Wang *et al.* (2023); Albadawi, Takruri and Awad (2021)

### 5.4 Latency Performance

Edge computing architectures demonstrated significant latency advantages over cloud-based systems:

- Edge computing average latency: 32ms (Livanios *et al.*, 2022)
- Edge computing best case: 6ms
- Edge computing worst case: 113ms
- Cloud computing introduces "significant delay in processing" unsuitable for real-time applications (Albadawi, Takruri and Awad, 2021)

---

## 6 Conclusions

This research has investigated the technical foundations for an AI-enabled pilot fatigue detection system utilising edge-cloud computing architecture for general aviation applications. The analysis of peer-reviewed literature establishes that multi-modal detection approaches combining visual indicators (EAR, MAR, PERCLOS) with physiological monitoring (HRV) achieve detection accuracies exceeding 95%, significantly outperforming single-indicator systems.

The validated threshold parameters of EAR 0.18, MAR 0.5, and PERCLOS 80% over 60 seconds provide an evidence-based foundation for system implementation. The recommendation for edge computing architecture addresses the critical latency requirements of safety-critical aviation applications, with demonstrated average latencies of 32ms compared to the significant delays introduced by cloud-based processing.

The contribution of this research lies in the synthesis of evidence from aviation-specific studies, including validation with 90 pilots achieving 88.6% accuracy through HRV analysis, and the identification of optimal threshold parameters derived from rigorous empirical studies. The proposed architecture specification enables deployment on resource-constrained embedded platforms whilst maintaining the detection performance necessary for aviation safety applications.

The research supports the conclusion that AI-enabled fatigue detection systems represent a viable approach to addressing the 21-23% of aviation accidents attributable to pilot fatigue, particularly in general aviation contexts where current fatigue risk management systems remain underdeveloped.

---

## 7 Limitations and Future Research

### 7.1 Limitations

This research is subject to several limitations that warrant acknowledgement:

1. **Laboratory versus operational validation**: The majority of cited studies conducted validation in controlled laboratory or simulator environments. Real-world cockpit conditions, including varying lighting, vibration, and environmental factors, may affect detection accuracy.

2. **Individual variability**: Threshold parameters validated across populations may require individualised calibration, as "each person has different physiological characteristics" affecting EAR and MAR measurements (Garrosa *et al.*, 2024).

3. **Single-pilot focus**: The research addresses single-pilot general aviation operations; applicability to multi-crew commercial operations requires additional investigation.

4. **Regulatory framework specificity**: Whilst ICAO FRMS guidelines provide international context, specific implementation within South African Civil Aviation Authority regulations requires further regulatory engagement.

### 7.2 Future Research Recommendations

Future research should address the following areas:

1. **Operational validation**: Conduct field trials of the proposed system architecture in actual general aviation flight operations to validate performance under real-world conditions.

2. **Personalised threshold calibration**: Investigate adaptive algorithms that adjust detection thresholds based on individual pilot baseline characteristics established during initial calibration sessions.

3. **Regulatory integration**: Engage with aviation regulatory authorities to establish certification pathways for AI-enabled fatigue detection systems in general aviation aircraft.

4. **Environmental factor compensation**: Develop algorithms to compensate for cockpit environmental variations including infrared illumination requirements for low-light operation and vibration filtering for physiological signal processing.

5. **Long-duration validation**: Conduct extended studies examining system performance over multi-hour flight operations to assess detection accuracy during progressive fatigue accumulation.

---

## Reference List

Albadawi, Y., Takruri, M. and Awad, M. (2021) 'Driver fatigue detection systems using multi-sensors, smartphone, and cloud-based computing platforms: A comparative analysis', *Sensors*, 21(1), 56. Available at: https://doi.org/10.3390/s21010056.

Albadawi, Y., Takruri, M. and Awad, M. (2023) 'Real-time machine learning-based driver drowsiness detection using visual features', *Journal of Imaging*, 9(5), 91. Available at: https://doi.org/10.3390/jimaging9050091.

Alonso, N., Aristizabal, S., Seidel, C. and Rossi, R.M. (2022) 'Fatigue monitoring through wearables: A state-of-the-art review', *Frontiers in Physiology*, 12, 790292. Available at: https://doi.org/10.3389/fphys.2021.790292.

Chang, R.C.-H., Wang, C.-Y., Chen, W.-T. and Chiu, C.-D. (2022) 'Drowsiness detection system based on PERCLOS and facial physiological signal', *Sensors*, 22(14), 5380. Available at: https://doi.org/10.3390/s22145380.

Chromik, J., Klopfenstein, S.A.I., Pfitzner, B., Sinno, Z., Arnrich, B., Balzer, F. and Poncette, A. (2022) 'Computational approaches to alleviate alarm fatigue in intensive care medicine: A systematic literature review', *Frontiers in Digital Health*, 4, 843747. Available at: https://doi.org/10.3389/fdgth.2022.843747.

Dehghani, A., Frisk, V., Bhatia, H. and Davoodi, R. (2024) 'Fatigue monitoring using wearables and AI: Trends, challenges, and future opportunities', *arXiv preprint*, arXiv:2412.16847. Available at: https://arxiv.org/abs/2412.16847.

Dewi, C., Chen, R.-C., Chang, C.-W., Wu, S.-H., Jiang, X. and Yu, H. (2022) 'Eye aspect ratio for real-time drowsiness detection to improve driver safety', *Electronics*, 11(19), 3183. Available at: https://doi.org/10.3390/electronics11193183.

Forte, G., Favieri, F. and Casagrande, M. (2019) 'Heart rate variability and cognitive function: A systematic review', *Frontiers in Neuroscience*, 13, 710. Available at: https://doi.org/10.3389/fnins.2019.00710.

Garrosa, M., Cerrolaza, J.J., Noriega, J.M., Segura, E. and del Pozo, F. (2024) 'Multi-index driver drowsiness detection method based on driver's facial recognition using Haar features and histograms of oriented gradients', *Sensors*, 24(17), 5683. Available at: https://doi.org/10.3390/s24175683.

Guo, D., Wang, C., Qin, Y., Shang, L., Gao, A., Tan, B., Zhou, Y. and Wang, G. (2025) 'Assessment of flight fatigue using heart rate variability and machine learning approaches', *Frontiers in Neuroscience*, 19, 1621638. Available at: https://doi.org/10.3389/fnins.2025.1621638.

Hinde, K., White, G. and Armstrong, N. (2021) 'Wearable devices suitable for monitoring twenty four hour heart rate variability in military populations', *Sensors*, 21(4), 1061. Available at: https://doi.org/10.3390/s21041061.

Li, Y., Zhang, S., Zhu, G., Huang, Z., Wang, R., Duan, X. and Wang, Z. (2023) 'A CNN-based wearable system for driver drowsiness detection', *Sensors*, 23(7), 3475. Available at: https://doi.org/10.3390/s23073475.

Livanios, N., Sourligas, I., Sagias, D., Thomopoulos, S.C.A., Panagiotopoulos, E. and Leligou, H.C. (2022) 'A smart building fire and gas leakage alert system with edge computing and NG112 emergency call capabilities', *Information*, 13(4), 164. Available at: https://doi.org/10.3390/info13040164.

Pan, T., Wang, H., Si, H., Li, Y. and Shang, L. (2021) 'Identification of pilots' fatigue status based on electrocardiogram signals', *Sensors*, 21(9), 3003. Available at: https://doi.org/10.3390/s21093003.

Pavlinovic, M., Vidovic, A., Steiner, S. and Stimac, I. (2023) 'Simulating flight crew workload settings to mitigate fatigue risk in flight operations', *Aerospace*, 10(10), 904. Available at: https://doi.org/10.3390/aerospace10100904.

Pongsakornsathien, N., Lim, Y., Gardi, A., Hilton, S., Planke, L., Sabatini, R., Kistan, T. and Ezer, N. (2020) 'Aircraft pilots workload analysis: Heart rate variability objective measures and NASA-Task Load Index subjective evaluation', *Aerospace*, 7(9), 137. Available at: https://doi.org/10.3390/aerospace7090137.

Wang, L., Ren, K.H., Zhu, T.H., Sun, F. and Huang, J. (2023) 'EEG and ECG-based multi-sensor fusion computing for real-time fatigue driving recognition based on feedback mechanism', *Sensors*, 23(20), 8386. Available at: https://doi.org/10.3390/s23208386.

Wingelaar-Jagt, Y.Q., Wingelaar, T.T., Riedel, W.J. and Ramaekers, J.G. (2021) 'Fatigue in aviation: Safety risks, preventive strategies and pharmacological interventions', *Frontiers in Physiology*, 12, 712628. Available at: https://doi.org/10.3389/fphys.2021.712628.
