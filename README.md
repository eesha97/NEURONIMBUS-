NeuroNimbus: A Cloud-Powered AI System for Memory Reconstruction

1)Overview
NeuroNimbus is a cloud-powered AI-assisted memory reconstruction system designed to support individuals with cognitive disorders such as Alzheimer's disease and dementia. The platform enables caregivers to securely upload and organize memories, special life events, and reminders while allowing patients to access personalized memories through a simple and intuitive interface.
The system integrates lightweight Artificial Intelligence (AI), Natural Language Processing (NLP), cloud computing, and secure role-based authentication to organize memories, extract meaningful keywords, detect duplicate uploads, group memories by individuals, and provide secure patient-specific memory retrieval.

2)Problem Statement
Individuals with Alzheimer's disease and dementia often experience progressive memory loss, making it difficult to recognize family members, remember important life events, and perform daily activities. Traditional memory aids lack intelligent organization and personalization. NeuroNimbus addresses these challenges by providing a secure cloud-based memory management system that helps caregivers organize memories while enabling patients to revisit their life experiences through structured digital memory reconstruction.

3)Objectives
-Develop a cloud-based memory reconstruction platform.
-Assist Alzheimer's and dementia patients through organized memory retrieval.
-Enable caregivers to manage patient memories efficiently.
-Organize memories using lightweight AI techniques.
-Extract important keywords using Natural Language Processing.
-Detect duplicate memory uploads.
-Group memories based on person labels.
-Improve memory accessibility and caregiver support.

4)Features
-Secure User Authentication
-Role-Based Access Control (Caregiver & Patient)
-Automatic Patient ID Generation
-Memory Upload with Images, Captions and Labels
-TF-IDF Based Keyword Extraction
-Duplicate Memory Detection
-People-Based Memory Grouping
-Event Management with Photos
-Notes and Reminder Management
-Cloud-Based Media Storage
-Search and Memory Retrieval
-Lightweight AI-Based Memory Organization

5)Tech Stack
-Frontend

-Next.js
-React.js
-TypeScript
-Tailwind CSS

Backend

-Firebase Authentication
-Next.js API Routes
-Firebase SDK

Cloud Services

-Firebase Firestore
-Cloudinary

AI & NLP

-Text Preprocessing
-Tokenization
-Stop-word Removal
-TF-IDF Keyword Extraction
-Cosine Similarity
-Label-Based Clustering

6)System Architecture

The system consists of the following modules:

-User Authentication Module
-Patient Management Module
-Memory Management Module
-People Clustering Module
-Events Management Module
-Notes & Reminder Module
-NLP Processing Module
-Duplicate Detection Module
-Cloud Storage Module
-Database Layer

-Architecture Workflow

1. Caregiver logs into the application.
2. A unique Patient ID is generated during patient registration.
3. Memories are uploaded with images, captions and person labels.
4. Captions are processed using NLP.
5. TF-IDF extracts meaningful keywords.
6. Cosine Similarity detects duplicate memories.
7. Images are grouped into the People section.
8. Events and reminders are stored securely.
9. Images and metadata are stored in the cloud.
10. Patients access memories uploaded by their caregiver.

-People-Based Memory Organization

The People module groups uploaded memories according to manually assigned person labels. Each label represents one individual, and all memories associated with the same label are displayed together. Label normalization prevents duplicate labels such as "Ravi", "RAVI", and "ravi".

-Natural Language Processing (NLP)

The NLP pipeline consists of:

-Text Normalization
-Lowercase Conversion
-Tokenization
-Stop-word Removal
-TF-IDF Keyword Extraction

The extracted keywords improve memory organization, searching, and duplicate detection.

Duplicate Detection

Duplicate memories are identified using Cosine Similarity on TF-IDF vectors. When duplicate memories are detected, the image is stored only once while allowing multiple labels to be associated with the same memory.

Cloud Integration

Cloud services provide secure storage and retrieval.

-Cloudinary for image storage
-Firebase Firestore for structured data
-Firebase Authentication for secure login

7)Project Modules

1. User Authentication
2. Patient Management
3. Memory Management
4. People Module
5. Events Module
6. Notes & Reminder Module
7. NLP Module
8. Duplicate Detection Module

8)Benefits

-Personalized digital memory assistance
-Organized memory reconstruction
-Lightweight AI without deep learning
-Secure cloud-based storage
-Efficient duplicate detection
-Reduced caregiver workload
-Improved memory accessibility
-Scalable healthcare solution

9)Research Contribution

The proposed framework combines Cloud Computing, Natural Language Processing, TF-IDF Keyword Extraction, Duplicate Detection, Label-Based Memory Organization, and Role-Based Access Control to provide an intelligent, scalable, and secure digital memory reconstruction platform.

10)Project Team

-Aare Eesha Sree
-Kandukuri Abhinav
-Katravath Rahul

11)Guide
-Syed Ahmeduddin
Department of Computer Science and Engineering

12)Institution

Department of Computer Science and Engineering

Vardhaman College of Engineering

Hyderabad, Telangana, India

13)Conclusion

NeuroNimbus integrates cloud computing, lightweight Artificial Intelligence, and Natural Language Processing to build an intelligent memory reconstruction platform. The system securely organizes memories, extracts meaningful keywords, detects duplicate uploads, groups memories by individuals, and enables efficient retrieval. Its scalable cloud architecture and lightweight AI techniques make it a practical solution for supporting Alzheimer's and dementia patients.

