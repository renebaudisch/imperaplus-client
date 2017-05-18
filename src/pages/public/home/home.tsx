import "./home.scss";

import * as React from "react";
import { GridColumn, GridRow } from "../../../components/layout";
import { setDocumentTitle } from "../../../lib/title";
import { Slider } from "./slider";

export default class Home extends React.Component<{}, void> {
    public render() {
        return <div>
            <div>
                <Slider background="/assets/slider/slider.gif" slides={[{
                    headLines: [__("Conquer"), __("the world")],
                    bodyLines: [__("Fight"), __("on more than"), __("80 maps")],
                    img: "/assets/slider/map.png"
                }, {
                    headLines: [__("Win in"), __("tournaments")],
                    bodyLines: [__("with hundreds"), __("of players")],
                    img: "/assets/slider/tournaments.png"
                }, {
                    headLines: [__("Participate"), __("in"), __("leagues")],
                    bodyLines: [__("Participate in different"), __("leagues, alone or"), __("in a team")],
                    img: "/assets/slider/league.png"
                }]} />
            </div>
            <div className="container">
                <h2 className="headline">{__("Impera allows you to conquer the world! Or many others.")}</h2>
            </div>
            <GridRow>
                <GridColumn className="col-md-4">
                    <div className="feature">
                        <i className="fa fa-compress feature-icon"></i>
                        <div className="feature-desc">
                            <h4><span>{__("Many Different Maps")}</span></h4>
                            <p><span>{__("Play on up to 80 different maps against opponents from all over the world...")}</span></p>
                        </div>
                    </div>
                </GridColumn>
                <GridColumn className="col-md-4">
                    <div className="feature">
                        <i className="fa fa-cogs feature-icon"></i>
                        <div className="feature-desc">
                            <h4><span>{__("Great Community")}</span></h4>
                            <p><span>{__("Tournaments, Leagues: Impera is not limited to simple one vs one games, it offers a wide variety of challenges")}</span></p>
                        </div>
                    </div>
                </GridColumn>
                <GridColumn className="col-md-4">
                    <div className="feature">
                        <i className="fa fa-rocket feature-icon"></i>
                        <div className="feature-desc">
                            <h4><span>{__("Free As In Beer")}</span></h4>
                            <p><span>{__("Impera is completely free, no hidden fees, no \"in-app\" purchases...")}</span></p>
                        </div>
                    </div>
                </GridColumn>
            </GridRow>
        </div>;
    }
}