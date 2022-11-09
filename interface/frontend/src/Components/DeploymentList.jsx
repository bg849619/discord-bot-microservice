import React from "react";

import Deployment from "./Deployment";

function DeploymentList(props) {
    if(!props.deployments)
        throw "DeploymentList expects a deployments prop";
    
    return (<div>
        {
            props.deployments.map((deployment) => {
                <Deployment />
            })
        }
    </div>);
}

export default DeploymentList;