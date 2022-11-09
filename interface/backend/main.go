package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	apiv1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

var NAMESPACE = os.Getenv("K8S_NAMESPACE")

var Deployments *appsv1.DeploymentList
var Pods *apiv1.PodList

type ResourceResponse struct {
	Deployments *appsv1.DeploymentList `json:"deployments"`
	Pods        *apiv1.PodList         `json:"pods"`
}

func getResources(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	result, err := json.Marshal(ResourceResponse{Deployments: Deployments, Pods: Pods})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Error sending response")
	}
	w.Write(result)
}

func main() {
	config, err := rest.InClusterConfig()
	if err != nil {
		panic(err.Error())
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}

	deploymentsClient := clientset.AppsV1().Deployments(NAMESPACE)

	http.HandleFunc("/api", getResources)

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	err = http.ListenAndServe(":80", nil)
	if err != nil {
		panic(err.Error())
	}

	for {
		deployments, err := deploymentsClient.List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			panic(err.Error())
		}

		pods, err := clientset.CoreV1().Pods(NAMESPACE).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			panic(err.Error())
		}

		Pods = pods
		Deployments = deployments

		time.Sleep(10 * time.Second)
	}

}
