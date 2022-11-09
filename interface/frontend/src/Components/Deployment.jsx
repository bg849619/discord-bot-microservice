import React from "react";

function Deployment(props) {
    if(!props.deployment)
        throw "Deployment requires a deployment prop.";

     return (
        <div className="deployment">
            <h3>{props.deployment.name}</h3>
            Available: <b>{props.deployment.ReadyReplicas}</b> 
            Total: <b>{props.deployment.Replicas}</b>
        </div>
     )
}

export default Deployment;